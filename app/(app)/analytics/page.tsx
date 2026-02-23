"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePollingQuery } from "@/lib/hooks/use-polling-query";
import { fetchAnalyticsKpi, fetchServiceAnalytics } from "@/lib/queries/dashboard";
import { exportWiseryWorkbook } from "@/lib/export/xlsx";
import { formatDate, formatDayMonth, formatInt, formatMonthLabel, formatRub } from "@/lib/format";
import { applyBranchFilter, resolveDateRange } from "@/lib/queries/common";

export default function AnalyticsPage() {
  const params = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [exporting, setExporting] = useState<"month" | "quarter" | "halfyear" | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentMonthKey());

  const branch = params.get("branch") ?? "all";
  const period = (params.get("period") as "today" | "7d" | "30d" | "custom") ?? "30d";
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  const loader = useCallback(async () => {
    const [{ data: authData }, kpiRows, serviceRows] = await Promise.all([
      supabase.auth.getUser(),
      fetchAnalyticsKpi(supabase, branch, period, from, to),
      fetchServiceAnalytics(supabase, branch, period, from, to)
    ]);

    const userId = authData.user?.id;
    let profileCreatedAt: string | null = null;
    let orgId: string | null = null;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at, org_id")
        .eq("user_id", userId)
        .single();
      profileCreatedAt = profile?.created_at ?? null;
      orgId = profile?.org_id ?? null;
    }

    const range = resolveDateRange(period, from, to);
    let automationRuns: Array<{ automation_key: string; booked: number }> = [];
    if (orgId) {
      const query = applyBranchFilter(
        supabase
          .from("automation_runs")
          .select("automation_key, booked")
          .eq("org_id", orgId)
          .gte("day", range.from)
          .lte("day", range.to),
        branch
      );
      const { data } = await query;
      automationRuns = (data || []) as Array<{ automation_key: string; booked: number }>;
    }

    return { kpiRows, serviceRows, profileCreatedAt, automationRuns };
  }, [supabase, branch, period, from, to]);

  const { data, loading, error } = usePollingQuery(loader, { intervalMs: 20000, enabled: true });

  useEffect(() => {
    if (period === "30d") {
      setSelectedMonth(currentMonthKey());
    }
  }, [period]);

  const handleExport = async (periodLabel: "month" | "quarter" | "halfyear") => {
    setExporting(periodLabel);

    try {
      const profileQuery = await supabase.auth.getUser();
      const userId = profileQuery.data.user?.id;
      if (!userId) {
        throw new Error("Нет сессии пользователя");
      }

      const { data: profile } = await supabase.from("profiles").select("org_id").eq("user_id", userId).single();
      if (!profile) {
        throw new Error("Профиль не найден");
      }

      const rangeMap = {
        month: { from: resolveDateRange("30d").from, to: resolveDateRange("30d").to },
        quarter: (() => {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 89);
          return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
        })(),
        halfyear: (() => {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 179);
          return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
        })()
      } as const;

      const range = rangeMap[periodLabel];

      const branchFilter = branch === "all" ? null : branch;

      const [
        { data: kpiDaily },
        { data: campaigns },
        { data: reviewsSnapshot },
        { data: org },
        { data: branchRow }
      ] = await Promise.all([
        (branchFilter
          ? supabase
              .from("kpi_daily")
              .select("day, unique_inquiries, total_messages, new_bookings, revenue, potential_revenue, no_show_count")
              .eq("org_id", profile.org_id)
              .eq("branch_id", branchFilter)
          : supabase
              .from("kpi_daily")
              .select("day, unique_inquiries, total_messages, new_bookings, revenue, potential_revenue, no_show_count")
              .eq("org_id", profile.org_id)
              .is("branch_id", null))
          .gte("day", range.from)
          .lte("day", range.to)
          .order("day"),
        supabase
          .from("campaigns")
          .select("title, status, created_at, campaign_runs(sent, delivered, read, replied, booked, errors)")
          .eq("org_id", profile.org_id)
          .gte("created_at", `${range.from}T00:00:00`)
          .lte("created_at", `${range.to}T23:59:59`),
        supabase.from("reviews_daily").select("day, source, rating, reviews_count").eq("org_id", profile.org_id).order("day", { ascending: false }).limit(30),
        supabase.from("orgs").select("name").eq("id", profile.org_id).single(),
        branchFilter ? supabase.from("branches").select("name").eq("id", branchFilter).single() : Promise.resolve({ data: null })
      ]);

      const bookingSummary = (kpiDaily || []).map((row) => ({
        day: row.day,
        new_bookings: row.new_bookings,
        revenue: row.revenue,
        no_show_count: row.no_show_count
      }));

      const campaignsSummary = (campaigns || []).map((campaign) => {
        const run = (campaign as any).campaign_runs?.[0] || {};
        return {
          title: campaign.title,
          status: campaign.status,
          created_at: campaign.created_at,
          sent: run.sent ?? 0,
          delivered: run.delivered ?? 0,
          read: run.read ?? 0,
          replied: run.replied ?? 0,
          booked: run.booked ?? 0,
          errors: run.errors ?? 0
        };
      });

      exportWiseryWorkbook({
        orgName: org?.name || "org",
        branchName: branchRow?.name || "all",
        periodLabel,
        payload: {
          kpiDaily: kpiDaily || [],
          bookingsSummary: bookingSummary,
          campaignsSummary,
          reviewsSnapshot: reviewsSnapshot || []
        }
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка экспорта");
    } finally {
      setExporting(null);
    }
  };

  const minMonthKey = data?.profileCreatedAt ? monthKey(data.profileCreatedAt) : currentMonthKey();
  useEffect(() => {
    if (period !== "30d") return;
    if (selectedMonth < minMonthKey) {
      setSelectedMonth(minMonthKey);
    }
  }, [minMonthKey, period, selectedMonth]);

  if (loading) {
    return <div className="text-sm text-muted">Загрузка аналитики...</div>;
  }

  if (error || !data) {
    return <Alert className="border-danger/50"><AlertTitle>Ошибка</AlertTitle><AlertDescription>{error || "Нет данных"}</AlertDescription></Alert>;
  }
  const filteredRows =
    period === "30d" ? data.kpiRows.filter((row) => monthKey(row.day) === selectedMonth) : data.kpiRows;

  const totals = filteredRows.reduce(
    (acc, row) => {
      acc.unique_inquiries += row.unique_inquiries;
      acc.total_messages += row.total_messages;
      acc.inbound_messages += row.inbound_messages ?? 0;
      acc.outbound_messages += row.outbound_messages ?? 0;
      acc.new_bookings += row.new_bookings;
      acc.revenue += Number(row.revenue);
      acc.no_show_count += row.no_show_count;
      return acc;
    },
    {
      unique_inquiries: 0,
      total_messages: 0,
      inbound_messages: 0,
      outbound_messages: 0,
      new_bookings: 0,
      revenue: 0,
      no_show_count: 0
    }
  );

  const daysCount = filteredRows.length || 1;
  const safeDiv = (num: number, denom: number) => (denom > 0 ? num / denom : 0);
  const conversionRate = safeDiv(totals.new_bookings, totals.unique_inquiries);
  const noShowRate = safeDiv(totals.no_show_count, totals.new_bookings);
  const avgCheck = safeDiv(totals.revenue, totals.new_bookings);
  const avgMessagesPerInquiry = safeDiv(totals.total_messages, totals.unique_inquiries);
  const avgRevenuePerDay = safeDiv(totals.revenue, daysCount);
  const avgBookingsPerDay = safeDiv(totals.new_bookings, daysCount);
  const inboundOutboundTotal = totals.inbound_messages + totals.outbound_messages;
  const attendedBookings = Math.max(totals.new_bookings - totals.no_show_count, 0);

  const chartData = filteredRows.map((row) => ({
    day: formatDayMonth(row.day),
    unique_inquiries: row.unique_inquiries,
    total_messages: row.total_messages,
    inbound_messages: row.inbound_messages ?? 0,
    outbound_messages: row.outbound_messages ?? 0,
    new_bookings: row.new_bookings,
    revenue: Number(row.revenue),
    conversion: row.unique_inquiries ? Number(((row.new_bookings / row.unique_inquiries) * 100).toFixed(2)) : 0,
    avg_check: row.new_bookings ? Number((Number(row.revenue) / row.new_bookings).toFixed(0)) : 0,
    no_show_rate: row.new_bookings ? Number(((row.no_show_count / row.new_bookings) * 100).toFixed(2)) : 0
  }));

  const cancellationsDonutData = [
    { name: "Отмена за день", value: 0, color: "#f59e0b" },
    { name: "Отмена за час", value: 0, color: "#f97316" },
    { name: "Не пришел", value: totals.no_show_count, color: "#ef4444" },
    { name: "Позвонил и отменил", value: 0, color: "#38bdf8" }
  ];

  const bookingsDonutData = [
    { name: "Пришли", value: attendedBookings, color: "#00E378" },
    { name: "Не пришли", value: totals.no_show_count, color: "#f59e0b" }
  ];

  const serviceColors = ["#00E378", "#22d3ee", "#f472b6", "#a78bfa", "#94a3b8"];
  const topServices = data.serviceRows.slice(0, 4);
  const restRevenue = data.serviceRows.slice(4).reduce((sum, row) => sum + Number(row.revenue), 0);
  const serviceDonutData = [
    ...topServices.map((row, index) => ({
      name: row.service_name,
      value: Number(row.revenue),
      color: serviceColors[index] || "#94a3b8"
    })),
    ...(restRevenue > 0 ? [{ name: "Прочее", value: restRevenue, color: "#475569" }] : [])
  ];

  const topRevenueDays = [...filteredRows]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, 5);
  const topBookingDays = [...filteredRows]
    .sort((a, b) => b.new_bookings - a.new_bookings)
    .slice(0, 5);

  const reactivatedBookings = (data.automationRuns || [])
    .filter((row) => row.automation_key === "inactive_50_days")
    .reduce((sum, row) => sum + Number(row.booked || 0), 0);

  const savedHours = ((totals.outbound_messages || 0) * 1.2) / 60;
  const retentionRate = null;
  const offHoursBookings = null;
  const avgResponseSec = null;
  const serviceRevenue = data.serviceRows.reduce((sum, row) => sum + Number(row.revenue), 0);
  const serviceBookings = data.serviceRows.reduce((sum, row) => sum + Number(row.bookings_count), 0);
  const avgServiceCheck = serviceBookings > 0 ? serviceRevenue / serviceBookings : null;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Полная аналитика"
        description="Показатели эффективности вашего сервиса и бизнеса"
        rightSlot={
          <div className="flex gap-2">
            {period === "30d" && (
              <div className="min-w-[160px]">
                <select
                  className="h-10 w-full rounded-md border border-border bg-black px-3 text-sm"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                >
                  {monthOptions(minMonthKey).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button variant="outline" onClick={() => handleExport("month")} disabled={exporting !== null}>
              <Download className="mr-2 size-4" />
              Месяц
            </Button>
            <Button variant="outline" onClick={() => handleExport("quarter")} disabled={exporting !== null}>
              <Download className="mr-2 size-4" />
              Квартал
            </Button>
            <Button variant="outline" onClick={() => handleExport("halfyear")} disabled={exporting !== null}>
              <FileSpreadsheet className="mr-2 size-4" />
              Полгода
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Выручка за период" value={formatRub(totals.revenue)} hint={`Средняя в день: ${formatRub(avgRevenuePerDay)}`} valueClass="text-accent" />
        <StatCard title="Записи за период" value={formatInt(totals.new_bookings)} hint={`Средняя в день: ${avgBookingsPerDay.toFixed(1)}`} />
        <StatCard title="Конверсия переписки в запись" value={`${(conversionRate * 100).toFixed(1)}%`} hint="Записи / обращения" valueClass="text-accent" />
        <StatCard title="Средний чек" value={formatRub(avgCheck)} hint="Выручка / записи" />
        <StatCard
          title="Не пришли"
          value={`${(noShowRate * 100).toFixed(1)}%`}
          hint={`Всего: ${formatInt(totals.no_show_count)}`}
          valueClass={
            noShowRate * 100 <= 3
              ? "text-accent"
              : noShowRate * 100 <= 6
              ? "text-warning"
              : "text-danger"
          }
        />
        <StatCard title="Сообщений на обращение" value={avgMessagesPerInquiry.toFixed(1)} hint={`Всего сообщений: ${formatInt(totals.total_messages)}`} />
        <StatCard title="Средняя выручка в день" value={formatRub(avgRevenuePerDay)} hint={`Дней: ${formatInt(daysCount)}`} />
        <StatCard
          title="Возвращаемость клиентов"
          value={retentionRate === null ? "—" : `${retentionRate}%`}
          hint="Нет данных: нужен повторный визит клиента."
        />
      </section>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>Входящие сообщения: <span className="text-white">{formatInt(totals.inbound_messages)}</span></span>
        <span>Исходящие сообщения: <span className="text-white">{formatInt(totals.outbound_messages)}</span></span>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Записи в нерабочее время"
          value={offHoursBookings === null ? "—" : formatInt(offHoursBookings)}
          hint="Нет данных: нужны времена создания записей."
        />
        <StatCard
          title="Сэкономленное время администратора"
          value={`${savedHours.toFixed(1)} ч`}
          hint={`Growice сэкономил ${savedHours.toFixed(1)} часа работы за период.`}
          valueClass="text-accent"
        />
        <StatCard
          title="Реанимированные клиенты"
          value={formatInt(reactivatedBookings)}
          hint="Записи после триггера inactive_50_days."
        />
        <StatCard
          title="Средняя скорость ответа Агента"
          value={avgResponseSec === null ? "—" : `${avgResponseSec} сек`}
          hint="Нет данных: нужны timestamps ответов ИИ."
        />
      </section>

      <section className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Уникальные обращения по дням</span>
              <InfoTip text="Уникальные обращения за день: первое входящее сообщение клиента за день." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={chartData} xKey="day" lineKey="unique_inquiries" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Сообщения по дням</span>
              <InfoTip text="Общее число сообщений за день: входящие + исходящие." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={chartData} xKey="day" lineKey="total_messages" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Записи по дням</span>
              <InfoTip text="Количество новых записей, созданных в каждый день." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={chartData} xKey="day" lineKey="new_bookings" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Выручка по дням</span>
              <InfoTip text="Фактическая выручка за каждый день." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={chartData} xKey="day" lineKey="revenue" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Конверсия в запись по дням</span>
              <InfoTip text="Конверсия = записи / уникальные обращения за день." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart data={chartData} xKey="day" lineKey="conversion" />
          </CardContent>
        </Card>

      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Отмены записей</span>
              <InfoTip text="Соотношение отмен по этапам: за день, за час, no-show, отмена по звонку." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={cancellationsDonutData}
              centerLabel="Всего"
              centerValue={formatInt(
                cancellationsDonutData.reduce((sum, item) => sum + Number(item.value || 0), 0)
              )}
            />
            <div className="mt-3 space-y-1 text-xs text-muted">
              {cancellationsDonutData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span>{formatInt(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Записи: пришли и не пришли</span>
              <InfoTip text="Соотношение успешных визитов и no-show за период." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={bookingsDonutData} centerLabel="Записи" centerValue={formatInt(totals.new_bookings)} />
            <div className="mt-3 space-y-1 text-xs text-muted">
              {bookingsDonutData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span>{formatInt(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Выручка по услугам</span>
              <InfoTip text="Доля выручки по услугам. Прочее = сумма остальных услуг." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceDonutData.length === 0 ? (
              <EmptyState title="Скоро / нет данных" description="Нет агрегатов по услугам" />
            ) : (
              <>
                <DonutChart data={serviceDonutData} centerLabel="Топ услуг" centerValue={formatRub(totals.revenue)} />
                <div className="mt-3 space-y-1 text-xs text-muted">
                  {serviceDonutData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: item.color }} />
                        {item.name}
                      </span>
                      <span>{formatRub(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Таблица KPI по дням</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[304px] overflow-auto scrollbar-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>День</TableHead>
                  <TableHead>Обращения</TableHead>
                  <TableHead>Сообщения</TableHead>
                  <TableHead>Записи</TableHead>
                  <TableHead>Выручка</TableHead>
                  <TableHead>Не пришли</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={`${row.day}`}>
                    <TableCell>{formatDate(row.day)}</TableCell>
                    <TableCell>{formatInt(row.unique_inquiries)}</TableCell>
                    <TableCell>{formatInt(row.total_messages)}</TableCell>
                    <TableCell>{formatInt(row.new_bookings)}</TableCell>
                    <TableCell>{formatRub(Number(row.revenue))}</TableCell>
                    <TableCell>{formatInt(row.no_show_count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Топ дней по выручке</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>День</TableHead>
                  <TableHead>Выручка</TableHead>
                  <TableHead>Записи</TableHead>
                  <TableHead>Обращения</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRevenueDays.map((row) => (
                  <TableRow key={`rev-${row.day}`}>
                    <TableCell>{formatDate(row.day)}</TableCell>
                    <TableCell>{formatRub(Number(row.revenue))}</TableCell>
                    <TableCell>{formatInt(row.new_bookings)}</TableCell>
                    <TableCell>{formatInt(row.unique_inquiries)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Топ дней по записям</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>День</TableHead>
                  <TableHead>Записи</TableHead>
                  <TableHead>Выручка</TableHead>
                  <TableHead>Не пришли</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topBookingDays.map((row) => (
                  <TableRow key={`book-${row.day}`}>
                    <TableCell>{formatDate(row.day)}</TableCell>
                    <TableCell>{formatInt(row.new_bookings)}</TableCell>
                    <TableCell>{formatRub(Number(row.revenue))}</TableCell>
                    <TableCell>{formatInt(row.no_show_count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Аналитика услуг</CardTitle>
          <CardDescription>Статистика по услугам: топ по выручке и количеству</CardDescription>
        </CardHeader>
        <CardContent>
          {data.serviceRows.length === 0 ? (
            <EmptyState title="Скоро / нет данных" description="Для услуг пока нет агрегатов в service_kpi_daily" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Услуга</TableHead>
                  <TableHead>Кол-во</TableHead>
                  <TableHead>Выручка</TableHead>
                  <TableHead>Средний чек</TableHead>
                  <TableHead>Не пришли</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.serviceRows.map((row) => (
                  <TableRow key={row.service_name}>
                    <TableCell>{row.service_name}</TableCell>
                    <TableCell>{formatInt(row.bookings_count)}</TableCell>
                    <TableCell>{formatRub(row.revenue)}</TableCell>
                    <TableCell>{formatRub(row.bookings_count > 0 ? row.revenue / row.bookings_count : 0)}</TableCell>
                    <TableCell>
                      <Badge variant={row.no_show_count > 0 ? "warning" : "success"}>{formatInt(row.no_show_count)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  valueClass
}: {
  title: string;
  value: string | number;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-2xl font-semibold ${valueClass || "text-white"}`}>{value}</div>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-xs text-muted">
      ?
      <span className="pointer-events-none absolute right-0 top-7 z-20 hidden w-[260px] rounded-md border border-border bg-black p-2 text-xs text-white shadow-card group-hover:block">
        {text}
      </span>
    </span>
  );
}

function monthKey(input: string) {
  return input.slice(0, 7);
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions(minMonthKey: string) {
  const now = new Date();
  const [minYear, minMonth] = minMonthKey.split("-").map(Number);
  const minDate = new Date(minYear, (minMonth || 1) - 1, 1);
  const options: { value: string; label: string }[] = [];
  let cursor = new Date(now.getFullYear(), now.getMonth(), 1);

  while (cursor >= minDate) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: formatMonthLabel(value) });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }

  return options;
}
