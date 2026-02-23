"use client";

import { useCallback, useMemo } from "react";
import { AlertTriangle, Star, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageTitle } from "@/components/shared/page-title";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePollingQuery } from "@/lib/hooks/use-polling-query";
import { fetchAnalyticsKpi, fetchDashboardData } from "@/lib/queries/dashboard";
import { formatDate, formatDayMonth, formatInt, formatPercent, formatRub } from "@/lib/format";
import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const params = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const branch = params.get("branch") ?? "all";
  const period = (params.get("period") as "today" | "7d" | "30d" | "custom") ?? "30d";
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  const loader = useCallback(async () => {
    const [dashboard, trendRows, monthRows] = await Promise.all([
      fetchDashboardData(supabase, branch, period, from, to),
      fetchAnalyticsKpi(supabase, branch, period === "today" ? "7d" : period, from, to),
      fetchAnalyticsKpi(supabase, branch, "30d")
    ]);

    return { dashboard, trendRows, monthRows };
  }, [supabase, branch, period, from, to]);

  const { data, loading, error } = usePollingQuery(loader, { intervalMs: 15000, enabled: true });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <Alert className="border-danger/50"><AlertTitle>Ошибка</AlertTitle><AlertDescription>{error || "Нет данных"}</AlertDescription></Alert>;
  }

  const kpi = data.dashboard.todayKpi;
  const monthTotals = data.monthRows.reduce(
    (acc, row) => {
      acc.revenue += Number(row.revenue) || 0;
      acc.unique += row.unique_inquiries || 0;
      acc.bookings += row.new_bookings || 0;
      acc.noShow += row.no_show_count || 0;
      return acc;
    },
    { revenue: 0, unique: 0, bookings: 0, noShow: 0 }
  );
  const monthNoShowRate = monthTotals.bookings > 0 ? (monthTotals.noShow / monthTotals.bookings) * 100 : 0;
  const ratingValue = data.dashboard.rating;
  const ratingClass =
    ratingValue >= 4.5
      ? "text-accent"
      : ratingValue >= 3
        ? "text-warning"
        : ratingValue > 0
          ? "text-danger"
          : "text-muted";
  const subStatus = data.dashboard.subscription?.status ?? "inactive";
  const paidUntil = data.dashboard.subscription?.paid_until;
  const daysLeft = paidUntil
    ? Math.ceil((new Date(paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showBillingReminder = daysLeft !== null && daysLeft <= 7;

  return (
    <div className="space-y-5">
      <PageTitle
        title="Главная"
        description="Быстрый срез по обращениям, записям, выручке и репутации"
        rightSlot={
          <span
            className={[
              "rounded-md px-3 py-1 text-sm font-semibold",
              subStatus !== "active"
                ? "bg-black text-white"
                : daysLeft !== null && daysLeft <= 7
                  ? "bg-danger text-white"
                  : daysLeft !== null && daysLeft <= 14
                    ? "bg-warning text-black"
                    : "bg-accent text-black"
            ].join(" ")}
          >
            {paidUntil
              ? `Подписка до ${formatDate(paidUntil)}`
              : "Подписка: нет данных"}
          </span>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Выручка за месяц"
          value={formatRub(monthTotals.revenue)}
          valueClassName="text-accent"
        />
        <KpiCard
          title="Сэкономлено времени"
          value={`${formatInt((kpi?.outbound_messages ?? 0) * 2)} мин`}
        />
        <KpiCard
          title="Уникальные обращения"
          value={formatInt(monthTotals.unique)}
          valueClassName="text-white"
        />
        <KpiCard title="Обращений (сегодня)" value={formatInt(kpi?.total_messages)} />
        <KpiCard
          title="Записей сегодня"
          value={formatInt(kpi?.new_bookings)}
          valueClassName={(kpi?.new_bookings ?? 0) === 0 ? "text-danger" : "text-white"}
        />
        <KpiCard
          title="Новые клиенты (месяц)"
          value={formatInt(data.dashboard.monthNewClients)}
          valueClassName="text-accent"
        />
        <KpiCard
          title="Не пришли (месяц)"
          value={`${formatInt(monthTotals.noShow)} / ${formatPercent(monthNoShowRate)}`}
          valueClassName={monthNoShowRate >= 5 ? "text-danger" : "text-white"}
        />
        <KpiCard
          title="Рейтинг и отзывы"
          value={`${ratingValue.toFixed(2)} ★ / ${formatInt(data.dashboard.reviewsCount)}`}
          valueClassName={ratingClass}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-accent" />Динамика обращений за период</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLineChart
              data={data.trendRows.map((row) => ({
                day: formatDayMonth(row.day),
                inquiries: row.unique_inquiries,
                messages: row.total_messages
              }))}
              xKey="day"
              lineKey="inquiries"
              secondaryLineKey="messages"
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Ключевые статусы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><MessageSquare className="size-4 text-accent" /> Входящие: {formatInt(kpi?.inbound_messages)}</div>
            <div className="flex items-center gap-2"><MessageSquare className="size-4 text-success" /> Исходящие: {formatInt(kpi?.outbound_messages)}</div>
            <div className="flex items-center gap-2"><AlertTriangle className="size-4 text-accent" /> Статус системы: Активна</div>
            <div className="flex items-center gap-2"><Star className="size-4 text-accent" /> Отзывы обновлены: {data.dashboard.reviewsCount > 0 ? "да" : "нет"}</div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
