"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, AlertTriangle, RefreshCw, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageTitle } from "@/components/shared/page-title";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePollingQuery } from "@/lib/hooks/use-polling-query";
import { fetchBillingData } from "@/lib/queries/billing";
import { formatDate, formatRub } from "@/lib/format";
import { callN8nProxy } from "@/lib/n8n/client";
import { Select } from "@/components/ui/select";

export default function BillingPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loadingPay, setLoadingPay] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("text");
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [channelUpdating, setChannelUpdating] = useState<"tg_connected" | "wa_connected" | "max_connected" | null>(null);
  const params = useSearchParams();
  const branch = params.get("branch") ?? "all";

  const loader = useCallback(async () => fetchBillingData(supabase), [supabase]);
  const { data, loading, error, refetch } = usePollingQuery(loader, { intervalMs: 15000, enabled: true });

  const planLabels: Record<string, string> = {
    standard: "Стандарт",
    text: "Text",
    voice_start: "Voice–Start",
    voice_pro: "Voice–Pro",
    voice_max: "Voice–Max"
  };
  const planCards = [
    {
      value: "text",
      title: "Text",
      description: "Чат-бот, автоматизация FAQ и базовые рассылки.",
      price: 5900
    },
    {
      value: "voice_start",
      title: "Voice–Start",
      description: "Текст + базовые голосовые сценарии и входящие звонки.",
      price: 9900
    },
    {
      value: "voice_pro",
      title: "Voice–Pro",
      description: "Расширенная голосовая логика, интеграции и аналитика.",
      price: 14900
    },
    {
      value: "voice_max",
      title: "Voice–Max",
      description: "Максимальный пакет: голос, интеграции и SLA.",
      price: 21900
    }
  ];
  const monthsOptions = [
    { value: "1", label: "1 месяц" },
    { value: "3", label: "3 месяца" },
    { value: "6", label: "6 месяцев" }
  ];
  const planPrices: Record<string, number> = {
    text: 5900,
    voice_start: 9900,
    voice_pro: 14900,
    voice_max: 21900
  };

  useEffect(() => {
    const currentPlan = data?.subscription?.plan;
    if (!currentPlan) return;
    if (planLabels[currentPlan]) {
      setSelectedPlan(currentPlan);
    }
  }, [data?.subscription?.plan]);

  async function createPaymentLink() {
    if (!data) return;

    setLoadingPay(true);
    try {
      const monthlyPrice = planPrices[selectedPlan] ?? planPrices.text;
      const amount = monthlyPrice * selectedMonths;
      const planLabel = planLabels[selectedPlan] || selectedPlan;
      const result = await callN8nProxy<
        {
          org_id: string;
          amount: number;
          description: string;
          success_url: string;
          fail_url: string;
          plan: string;
          months: number;
        },
        { payment_url: string; operation_id: string }
      >("/api/n8n/billing/create-link", {
        org_id: data.orgId,
        amount,
        description: `Оплата тарифа ${planLabel} • ${selectedMonths} мес.`,
        success_url: `${window.location.origin}/billing?branch=${branch}`,
        fail_url: `${window.location.origin}/billing?branch=${branch}`,
        plan: selectedPlan,
        months: selectedMonths
      });

      window.open(result.payment_url, "_blank", "noopener,noreferrer");
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setLoadingPay(false);
    }
  }

  async function syncPaymentStatus() {
    if (!data?.subscription?.last_payment_operation_id) {
      alert("Нет operation_id для проверки");
      return;
    }

    setSyncing(true);
    try {
      await callN8nProxy("/api/n8n/billing/sync-status", {
        org_id: data.orgId,
        operation_id: data.subscription.last_payment_operation_id
      });
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }

  async function toggleChannel(key: "tg_connected" | "wa_connected" | "max_connected", value: boolean) {
    if (!data) return;
    setChannelUpdating(key);
    try {
      const { error: updateError } = await supabase.from("org_settings").update({ [key]: value }).eq("org_id", data.orgId);
      if (updateError) {
        throw new Error(updateError.message);
      }
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка обновления канала");
    } finally {
      setChannelUpdating(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted">Загрузка биллинга...</div>;
  }

  if (error || !data) {
    return <Alert className="border-danger/50"><AlertTitle>Ошибка</AlertTitle><AlertDescription>{error || "Нет данных"}</AlertDescription></Alert>;
  }

  const sub = data.subscription;
  const paidUntil = sub?.paid_until ? new Date(sub.paid_until) : null;
  const daysLeft = paidUntil ? Math.ceil((paidUntil.getTime() - Date.now()) / 86400000) : null;
  const showWarning = typeof daysLeft === "number" && daysLeft <= 7;
  const monthlyPrice = planPrices[selectedPlan] ?? planPrices.text;
  const totalAmount = monthlyPrice * selectedMonths;
  const subscriptionStatusLabels: Record<string, string> = {
    active: "Активна",
    inactive: "Неактивна",
    past_due: "Просрочена",
    canceled: "Отменена"
  };
  const paymentStatusLabels: Record<string, string> = {
    created: "Создан",
    paid: "Оплачен",
    failed: "Ошибка",
    refunded: "Возврат"
  };
  const tgEnabled = data.settings?.tg_connected ?? false;
  const waEnabled = data.settings?.wa_connected ?? false;
  const maxEnabled = data.settings?.max_connected ?? false;

  return (
    <div className="space-y-5">
      <PageTitle title="Система и оплата" description="Подписка, оплата через Точка и история операций" />

      {showWarning ? (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Напоминание по подписке</AlertTitle>
          <AlertDescription>До окончания подписки осталось {daysLeft} дн.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="size-4 text-accent" />Текущая подписка</CardTitle>
          <CardDescription>Статус и дата окончания читаются из Supabase</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Тариф</p>
            <p className="text-lg font-semibold">{sub?.plan ? planLabels[sub.plan] || sub.plan : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Статус</p>
            <Badge variant={sub?.status === "active" ? "success" : "warning"}>
              {sub?.status ? subscriptionStatusLabels[sub.status] || sub.status : "Неактивна"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted">Оплачено до</p>
            <p className="text-lg font-semibold">{sub?.paid_until ? formatDate(sub.paid_until) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Дней до конца</p>
            <p className="text-lg font-semibold">{daysLeft ?? "—"}</p>
          </div>

          <div className="md:col-span-4 space-y-3">
            <p className="text-xs text-muted">Выберите тариф</p>
            <div className="grid gap-3 md:grid-cols-4">
              {planCards.map((plan) => {
                const isActive = selectedPlan === plan.value;
                return (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setSelectedPlan(plan.value)}
                    className={`rounded-[0.420rem] border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-accent bg-accent/10 text-white"
                        : "border-border bg-black text-muted hover:border-accent/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{plan.title}</p>
                      <span className={`text-xs ${isActive ? "text-accent" : "text-muted"}`}>
                        {formatRub(plan.price)} / мес.
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted">{plan.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-4 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Срок оплаты</p>
              <Select
                options={monthsOptions}
                value={String(selectedMonths)}
                onChange={(event) => setSelectedMonths(Number(event.target.value))}
              />
            </div>
            <div>
              <p className="text-xs text-muted">Цена за месяц</p>
              <p className="text-2xl font-semibold text-accent">{formatRub(monthlyPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Итого к оплате</p>
              <p className="text-2xl font-semibold text-accent">{formatRub(totalAmount)}</p>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-wrap gap-2">
            <Button onClick={createPaymentLink} disabled={loadingPay}>
              {loadingPay ? "Готовим ссылку..." : "Оплатить"}
            </Button>
            <Button variant="outline" onClick={syncPaymentStatus} disabled={syncing}>
              <RefreshCw className="mr-2 size-4" />
              Проверить оплату
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="size-4 text-accent" />Управление системами</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span>Автоматические напоминания</span>
            <Badge variant="success">Активно</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span>Модератор Телеграм-канала</span>
            <Badge variant="warning">Отключено</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span>Telegram</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleChannel("tg_connected", !tgEnabled)}
                disabled={channelUpdating === "tg_connected"}
                className={`relative h-6 w-11 rounded-full border transition ${
                  tgEnabled ? "border-accent bg-accent/70" : "border-border bg-black"
                } ${channelUpdating === "tg_connected" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                    tgEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs text-muted">{tgEnabled ? "Включено" : "Отключено"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span>WhatsApp</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleChannel("wa_connected", !waEnabled)}
                disabled={channelUpdating === "wa_connected"}
                className={`relative h-6 w-11 rounded-full border transition ${
                  waEnabled ? "border-accent bg-accent/70" : "border-border bg-black"
                } ${channelUpdating === "wa_connected" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                    waEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs text-muted">{waEnabled ? "Включено" : "Отключено"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span>Max</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleChannel("max_connected", !maxEnabled)}
                disabled={channelUpdating === "max_connected"}
                className={`relative h-6 w-11 rounded-full border transition ${
                  maxEnabled ? "border-accent bg-accent/70" : "border-border bg-black"
                } ${channelUpdating === "max_connected" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                    maxEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs text-muted">{maxEnabled ? "Включено" : "Отключено"}</span>
            </div>
          </div>
          <p className="text-xs text-muted">Статус систем обновляется автоматически.</p>
        </CardContent>
      </Card>
    </div>
  );
}
