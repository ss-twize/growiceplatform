"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageTitle } from "@/components/shared/page-title";
import { EmptyState } from "@/components/shared/empty-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePollingQuery } from "@/lib/hooks/use-polling-query";
import { fetchMarketingData, createCampaign } from "@/lib/queries/marketing";
import { formatDateTime, formatInt, formatRub } from "@/lib/format";
import { callN8nProxy } from "@/lib/n8n/client";

const channels = [
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" }
] as const;

const campaignSchema = z.object({
  title: z.string().min(2, "Введите название"),
  message: z.string().min(3, "Введите текст"),
  scope: z.enum(["current", "all"]),
  channel_telegram: z.boolean().default(false),
  channel_whatsapp: z.boolean().default(false),
  channel_email: z.boolean().default(false),
  channel_sms: z.boolean().default(false)
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function MarketingPage() {
  const params = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [submitting, setSubmitting] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGenderMenu, setShowGenderMenu] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const clientsScrollRef = useRef<HTMLDivElement | null>(null);
  const clientsTrackRef = useRef<HTMLDivElement | null>(null);
  const clientsThumbRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startTop: number } | null>(null);
  const campaignsScrollRef = useRef<HTMLDivElement | null>(null);
  const campaignsTrackRef = useRef<HTMLDivElement | null>(null);
  const campaignsThumbRef = useRef<HTMLDivElement | null>(null);
  const campaignsDragRef = useRef<{ startY: number; startTop: number } | null>(null);
  const automationScrollRef = useRef<HTMLDivElement | null>(null);
  const automationTrackRef = useRef<HTMLDivElement | null>(null);
  const automationThumbRef = useRef<HTMLDivElement | null>(null);
  const automationDragRef = useRef<{ startY: number; startTop: number } | null>(null);
  const [genderFilter, setGenderFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const branch = params.get("branch") ?? "all";
  const period = (params.get("period") as "today" | "7d" | "30d" | "custom") ?? "30d";
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      message: "",
      scope: "current",
      channel_telegram: true,
      channel_whatsapp: false,
      channel_email: false,
      channel_sms: false
    }
  });

  const loader = useCallback(async () => fetchMarketingData(supabase, branch, period, from, to), [supabase, branch, period, from, to]);
  const { data, loading, error, refetch } = usePollingQuery(loader, { intervalMs: 20000, enabled: true });

  async function handleSubmit(values: CampaignFormValues) {
    if (!data) return;

    const selectedChannels = channels
      .filter((channel) => values[`channel_${channel.key}` as keyof CampaignFormValues])
      .map((channel) => channel.key);

    if (!selectedChannels.length) {
      alert("Выберите хотя бы один канал");
      return;
    }

    setSubmitting(true);

    try {
      const branchId = values.scope === "all" ? null : branch === "all" ? null : branch;
      const campaign = await createCampaign(supabase, {
        org_id: data.orgId,
        branch_id: branchId,
        title: values.title,
        message: values.message,
        channels: selectedChannels as string[]
      });

      await callN8nProxy("/api/n8n/campaign/launch", {
        campaign_id: campaign.id,
        org_id: campaign.org_id,
        branch_id: campaign.branch_id
      });

      form.reset({
        title: "",
        message: "",
        scope: values.scope,
        channel_telegram: true,
        channel_whatsapp: false,
        channel_email: false,
        channel_sms: false
      });
      await refetch();
      alert("Кампания создана и отправлена в n8n");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка запуска рассылки");
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    queued: "В очереди",
    running: "Выполняется",
    done: "Завершена",
    failed: "Ошибка"
  };

  const channelLabels: Record<string, string> = {
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    email: "Email",
    sms: "SMS"
  };

  const channelBadgeClass = (value: string) => {
    const key = value.toLowerCase();
    if (key === "telegram") return "bg-sky-500/20 text-sky-300 border-sky-400/40";
    if (key === "whatsapp") return "bg-green-500/20 text-green-300 border-green-400/40";
    if (key === "phone" || key === "телефон") return "bg-white/10 text-white border-white/20";
    if (key === "max") return "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40";
    if (key === "vk") return "bg-blue-500/20 text-blue-300 border-blue-400/40";
    if (key === "yclients") return "bg-yellow-500/20 text-yellow-300 border-yellow-400/40";
    return "bg-white/5 text-muted border-border";
  };

  const genderFromTags = (tags: string[] | null | undefined) => {
    const normalized = (tags || []).map((tag) => tag.toLowerCase());
    if (normalized.some((tag) => ["female", "жен", "женский", "ж"].includes(tag))) return "Женский";
    if (normalized.some((tag) => ["male", "муж", "мужской", "м"].includes(tag))) return "Мужской";
    return "—";
  };

  const channelOptions = [
    { value: "all", label: "Все каналы" },
    { value: "telegram", label: "Telegram" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "phone", label: "Телефон" },
    { value: "max", label: "Max" },
    { value: "vk", label: "VK" },
    { value: "yclients", label: "Yclients" }
  ];

  const genderOptions = [
    { value: "all", label: "Все" },
    { value: "Женский", label: "Женский" },
    { value: "Мужской", label: "Мужской" },
    { value: "—", label: "Не указан" }
  ];

  const handleThumbMouseDown = (event: React.MouseEvent) => {
    const container = clientsScrollRef.current;
    const track = clientsTrackRef.current;
    if (!container) return;
    dragRef.current = { startY: event.clientY, startTop: container.scrollTop };

    const onMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current || !container) return;
      const delta = moveEvent.clientY - dragRef.current.startY;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const trackHeight = track?.clientHeight ?? container.clientHeight;
      const thumb = clientsThumbRef.current;
      const thumbHeight = thumb ? thumb.getBoundingClientRect().height : 28;
      const maxTop = trackHeight - thumbHeight;
      if (maxTop <= 0) return;
      const ratio = scrollHeight / maxTop;
      container.scrollTop = Math.min(scrollHeight, Math.max(0, dragRef.current.startTop + delta * ratio));
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleTrackClick = (event: React.MouseEvent) => {
    const container = clientsScrollRef.current;
    const track = clientsTrackRef.current ?? (event.currentTarget as HTMLDivElement);
    const thumb = clientsThumbRef.current;
    if (!container || !thumb) return;
    const rect = track.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const thumbHeight = thumb.getBoundingClientRect().height;
    const targetTop = Math.max(0, Math.min(rect.height - thumbHeight, clickY - thumbHeight / 2));
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const ratio = scrollHeight / (rect.height - thumbHeight || 1);
    container.scrollTop = targetTop * ratio;
  };

  const handleCampaignsThumbMouseDown = (event: React.MouseEvent) => {
    const container = campaignsScrollRef.current;
    const track = campaignsTrackRef.current;
    if (!container) return;
    campaignsDragRef.current = { startY: event.clientY, startTop: container.scrollTop };

    const onMove = (moveEvent: MouseEvent) => {
      if (!campaignsDragRef.current || !container) return;
      const delta = moveEvent.clientY - campaignsDragRef.current.startY;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const trackHeight = track?.clientHeight ?? container.clientHeight;
      const thumb = campaignsThumbRef.current;
      const thumbHeight = thumb ? thumb.getBoundingClientRect().height : 28;
      const maxTop = trackHeight - thumbHeight;
      if (maxTop <= 0) return;
      const ratio = scrollHeight / maxTop;
      container.scrollTop = Math.min(scrollHeight, Math.max(0, campaignsDragRef.current.startTop + delta * ratio));
    };

    const onUp = () => {
      campaignsDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleCampaignsTrackClick = (event: React.MouseEvent) => {
    const container = campaignsScrollRef.current;
    const track = campaignsTrackRef.current ?? (event.currentTarget as HTMLDivElement);
    const thumb = campaignsThumbRef.current;
    if (!container || !thumb) return;
    const rect = track.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const thumbHeight = thumb.getBoundingClientRect().height;
    const targetTop = Math.max(0, Math.min(rect.height - thumbHeight, clickY - thumbHeight / 2));
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const ratio = scrollHeight / (rect.height - thumbHeight || 1);
    container.scrollTop = targetTop * ratio;
  };

  const handleAutomationThumbMouseDown = (event: React.MouseEvent) => {
    const container = automationScrollRef.current;
    const track = automationTrackRef.current;
    if (!container) return;
    automationDragRef.current = { startY: event.clientY, startTop: container.scrollTop };

    const onMove = (moveEvent: MouseEvent) => {
      if (!automationDragRef.current || !container) return;
      const delta = moveEvent.clientY - automationDragRef.current.startY;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const trackHeight = track?.clientHeight ?? container.clientHeight;
      const thumb = automationThumbRef.current;
      const thumbHeight = thumb ? thumb.getBoundingClientRect().height : 28;
      const maxTop = trackHeight - thumbHeight;
      if (maxTop <= 0) return;
      const ratio = scrollHeight / maxTop;
      container.scrollTop = Math.min(scrollHeight, Math.max(0, automationDragRef.current.startTop + delta * ratio));
    };

    const onUp = () => {
      automationDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleAutomationTrackClick = (event: React.MouseEvent) => {
    const container = automationScrollRef.current;
    const track = automationTrackRef.current ?? (event.currentTarget as HTMLDivElement);
    const thumb = automationThumbRef.current;
    if (!container || !thumb) return;
    const rect = track.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const thumbHeight = thumb.getBoundingClientRect().height;
    const targetTop = Math.max(0, Math.min(rect.height - thumbHeight, clickY - thumbHeight / 2));
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const ratio = scrollHeight / (rect.height - thumbHeight || 1);
    container.scrollTop = targetTop * ratio;
  };

  const clientsForFilter = data?.clients ?? [];
  const filteredClients = clientsForFilter
    .map((client: any) => {
      const channels = (client.client_channels || []) as { channel: string; last_message_at?: string | null; username?: string | null }[];
      const sorted = [...channels].sort((a, b) => (a.last_message_at || "").localeCompare(b.last_message_at || ""));
      const latestChannel = sorted[sorted.length - 1]?.channel || client.source || "";
      const latestMessageAt = sorted[sorted.length - 1]?.last_message_at || null;
      const tgUsername = sorted.find((row) => row.channel === "telegram")?.username || null;
      const appointments = (client.appointments || []) as { service_name: string; start_at?: string | null; price?: number | null }[];
      const revenue = appointments.reduce((sum, row) => sum + Number(row.price || 0), 0);
      const services = Array.from(new Set(appointments.map((row) => row.service_name).filter(Boolean)));
      return {
        client,
        latestChannel,
        gender: genderFromTags(client.tags),
        revenue,
        tgUsername,
        latestMessageAt,
        services
      };
    })
    .filter(({ latestChannel, gender }) => {
      const channelMatch = channelFilter === "all" || latestChannel?.toLowerCase() === channelFilter;
      const genderMatch = genderFilter === "all" || gender === genderFilter;
      return channelMatch && genderMatch;
    });

  useEffect(() => {
    const container = clientsScrollRef.current;
    const track = clientsTrackRef.current;
    const thumb = clientsThumbRef.current;
    if (!container || !thumb || !track) return;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const trackHeight = track.clientHeight;
      if (scrollHeight <= clientHeight) {
        thumb.style.height = `${trackHeight}px`;
        thumb.style.top = "0px";
        thumb.style.opacity = "0.85";
        return;
      }
      const thumbHeight = Math.max(28, Math.round((clientHeight / scrollHeight) * trackHeight));
      const maxTop = trackHeight - thumbHeight;
      const top = Math.round((scrollTop / (scrollHeight - clientHeight)) * maxTop);
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.top = `${top}px`;
      thumb.style.opacity = "1";
    };

    const onScroll = () => requestAnimationFrame(updateThumb);
    const onResize = () => requestAnimationFrame(updateThumb);
    const onContentChange = () => requestAnimationFrame(updateThumb);

    container.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onContentChange);
    observer.observe(container);
    observer.observe(track);
    updateThumb();
    requestAnimationFrame(updateThumb);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [filteredClients.length]);

  const campaignsLength = data?.campaigns?.length ?? 0;
  useEffect(() => {
    const container = campaignsScrollRef.current;
    const track = campaignsTrackRef.current;
    const thumb = campaignsThumbRef.current;
    if (!container || !thumb || !track) return;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const trackHeight = track.clientHeight;
      if (scrollHeight <= clientHeight) {
        thumb.style.height = `${trackHeight}px`;
        thumb.style.top = "0px";
        thumb.style.opacity = "0.85";
        return;
      }
      const thumbHeight = Math.max(28, Math.round((clientHeight / scrollHeight) * trackHeight));
      const maxTop = trackHeight - thumbHeight;
      const top = Math.round((scrollTop / (scrollHeight - clientHeight)) * maxTop);
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.top = `${top}px`;
      thumb.style.opacity = "1";
    };

    const onScroll = () => requestAnimationFrame(updateThumb);
    const onResize = () => requestAnimationFrame(updateThumb);
    const onContentChange = () => requestAnimationFrame(updateThumb);

    container.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onContentChange);
    observer.observe(container);
    observer.observe(track);
    updateThumb();
    requestAnimationFrame(updateThumb);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [campaignsLength]);

  const automationLength = data?.automationRuns?.length ?? 0;
  useEffect(() => {
    const container = automationScrollRef.current;
    const track = automationTrackRef.current;
    const thumb = automationThumbRef.current;
    if (!container || !thumb || !track) return;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const trackHeight = track.clientHeight;
      if (scrollHeight <= clientHeight) {
        thumb.style.height = `${trackHeight}px`;
        thumb.style.top = "0px";
        thumb.style.opacity = "0.85";
        return;
      }
      const thumbHeight = Math.max(28, Math.round((clientHeight / scrollHeight) * trackHeight));
      const maxTop = trackHeight - thumbHeight;
      const top = Math.round((scrollTop / (scrollHeight - clientHeight)) * maxTop);
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.top = `${top}px`;
      thumb.style.opacity = "1";
    };

    const onScroll = () => requestAnimationFrame(updateThumb);
    const onResize = () => requestAnimationFrame(updateThumb);
    const onContentChange = () => requestAnimationFrame(updateThumb);

    container.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onContentChange);
    observer.observe(container);
    observer.observe(track);
    updateThumb();
    requestAnimationFrame(updateThumb);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [automationLength]);

  if (loading) {
    return <div className="text-sm text-muted">Загрузка маркетинга...</div>;
  }

  if (error || !data) {
    return <Alert className="border-danger/50"><AlertTitle>Ошибка</AlertTitle><AlertDescription>{error || "Нет данных"}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Клиенты и Рассылка"
        description="Ваши клиенты и Маркетинговые кампании"
        rightSlot={
          <Button
            noPageStyle
            variant="outline"
            className="h-10 rounded-md border border-border bg-black px-4 text-sm text-white hover:bg-black/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            onClick={() => setShowNewCampaign(true)}
          >
            Новая рассылка
          </Button>
        }
      />

      {showNewCampaign ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[560px] rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Новая рассылка</h3>
              <Button noPageStyle variant="ghost" onClick={() => {
                setShowNewCampaign(false);
                setShowEmojiPicker(false);
              }}>Закрыть</Button>
            </div>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
              <div>
                <Label htmlFor="title">Название кампании</Label>
                <Input id="title" {...form.register("title")} placeholder="Например: Напоминание о записи" />
                <p className="text-xs text-danger">{form.formState.errors.title?.message}</p>
              </div>

              <div>
                <Label htmlFor="message">Текст</Label>
                <Textarea id="message" {...form.register("message")} placeholder="Введите текст рассылки" />
                <p className="text-xs text-danger">{form.formState.errors.message?.message}</p>
              </div>

              <div>
                <Label htmlFor="scope">Филиал отправки</Label>
                <select
                  id="scope"
                  className="h-10 w-full rounded-md border border-border bg-black px-3 text-sm"
                  {...form.register("scope")}
                >
                  <option value="current">Текущий филиал</option>
                  <option value="all">Все филиалы</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Фильтры</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={genderFilter}
                    options={[
                      { value: "all", label: "Пол: все" },
                      { value: "Женский", label: "Пол: женский" },
                      { value: "Мужской", label: "Пол: мужской" },
                      { value: "—", label: "Пол: не указан" }
                    ]}
                    onChange={(event) => setGenderFilter(event.target.value)}
                  />
                  <Input placeholder="Выручка от (₽)" />
                  <Input placeholder="LTV от (₽)" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Каналы</Label>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
                  {channels.map((channel) => (
                    <label key={channel.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="accent-accent" {...form.register(`channel_${channel.key}`)} />
                      {channel.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center justify-between gap-2">
                <div className="relative">
                  <Button noPageStyle variant="outline" type="button" onClick={() => setShowEmojiPicker((prev) => !prev)}>
                    Эмоджи
                  </Button>
                  {showEmojiPicker ? (
                    <div className="absolute bottom-12 left-0 z-10 w-[260px] rounded-xl border border-border bg-black p-3 shadow-card">
                      <div className="grid grid-cols-8 gap-2 text-lg">
                        {[
                          "😀","😃","😄","😁","😅","😂","🤣","😊",
                          "🙂","😉","😍","😘","😎","🤩","🥳","😇",
                          "🤗","🤔","😴","😮","😱","😡","🤝","🙏",
                          "👌","👍","👎","✌️","🤞","👏","💪","🧠",
                          "🔥","⚡","💥","💫","✨","🌟","💎","💡",
                          "💬","🗨️","📣","📌","📍","📅","🗓️","⏰",
                          "✅","🟢","🟡","🔴","⭐","💚","💛","💙",
                          "🎉","🎊","🎁","🎯","🧩","🚀","🏆","💼"
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface"
                            onClick={() => {
                              const current = form.getValues("message") || "";
                              form.setValue("message", `${current}${emoji}`);
                              setShowEmojiPicker(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <span className="text-sm text-muted md:mr-auto md:ml-3">
                  Получателей: {data.campaigns[0]?.campaign_runs?.[0]?.sent ? formatInt(data.campaigns[0].campaign_runs[0].sent) : "—"}
                </span>
                <div className="flex items-center gap-2">
                  <Button noPageStyle variant="outline" type="button" onClick={() => {
                    setShowNewCampaign(false);
                    setShowEmojiPicker(false);
                  }}>
                    Отмена
                  </Button>
                  <Button noPageStyle type="submit" disabled={submitting}>
                    {submitting ? "Запуск..." : "Запустить"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Клиенты</CardTitle>
            <CardDescription>Последние контакты и канал связи</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative max-h-[420px] min-h-[420px] flex-1">
              <div
                ref={clientsScrollRef}
                className="max-h-[420px] min-h-[420px] flex-1 overflow-y-scroll custom-scrollbar"
              >
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm text-muted hover:text-white"
                        onClick={() => {
                          setShowGenderMenu((prev) => !prev);
                          setShowChannelMenu(false);
                        }}
                      >
                        Пол
                        <span className="text-xs text-muted">{genderFilter !== "all" ? genderFilter : ""}</span>
                        <span className="text-xs text-muted">▾</span>
                      </button>
                      {showGenderMenu ? (
                        <div className="absolute left-0 top-8 z-10 w-[160px] rounded-xl border border-border bg-black p-2 text-xs shadow-card">
                          {genderOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className="w-full rounded-md px-2 py-1 text-left text-sm text-white hover:bg-white/5"
                              onClick={() => {
                                setGenderFilter(option.value);
                                setShowGenderMenu(false);
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </TableHead>
                    <TableHead>Выручка</TableHead>
                    <TableHead className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm text-muted hover:text-white"
                        onClick={() => {
                          setShowChannelMenu((prev) => !prev);
                          setShowGenderMenu(false);
                        }}
                      >
                        Канал
                        <span className="text-xs text-muted">{channelFilter !== "all" ? channelFilter : ""}</span>
                        <span className="text-xs text-muted">▾</span>
                      </button>
                      {showChannelMenu ? (
                        <div className="absolute left-0 top-8 z-10 w-[180px] rounded-xl border border-border bg-black p-2 text-xs shadow-card">
                          {channelOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className="w-full rounded-md px-2 py-1 text-left text-sm text-white hover:bg-white/5"
                              onClick={() => {
                                setChannelFilter(option.value);
                                setShowChannelMenu(false);
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </TableHead>
                    <TableHead>Телеграм</TableHead>
                    <TableHead>Последнее обращение</TableHead>
                    <TableHead>Услуги</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted">
                        Нет клиентов
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-[340px] text-center align-middle text-base text-muted">
                        Нет клиентов с такими параметрами
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map(({ client, latestChannel, gender, revenue, tgUsername, latestMessageAt, services }) => (
                      <TableRow key={client.id}>
                        <TableCell>{client.full_name || "—"}</TableCell>
                        <TableCell>{client.phone || "—"}</TableCell>
                        <TableCell>{gender}</TableCell>
                        <TableCell>{formatRub(revenue)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${channelBadgeClass(latestChannel)}`}>
                            {latestChannel || "—"}
                          </span>
                        </TableCell>
                        <TableCell>{tgUsername ? `@${tgUsername}` : "—"}</TableCell>
                        <TableCell>{latestMessageAt ? formatDateTime(latestMessageAt) : "—"}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{services.length ? services.join(", ") : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-12 bg-gradient-to-b from-transparent to-surface" />
              <div className="scrollbar-track" ref={clientsTrackRef} onClick={handleTrackClick}>
                <div
                  className="scrollbar-thumb"
                  ref={clientsThumbRef}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    handleThumbMouseDown(event);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Результаты кампаний</CardTitle>
        </CardHeader>
        <CardContent>
          {data.campaigns.length === 0 ? (
            <EmptyState title="Кампаний пока нет" description="Создайте первую рассылку через форму выше" />
          ) : (
            <div className="relative max-h-[420px] min-h-[420px]">
              <div
                ref={campaignsScrollRef}
                className="max-h-[420px] min-h-[420px] overflow-y-scroll custom-scrollbar"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Каналы</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Отправлено</TableHead>
                      <TableHead>Доставлено</TableHead>
                      <TableHead>Прочитано</TableHead>
                      <TableHead>Ответили</TableHead>
                      <TableHead>Записались</TableHead>
                      <TableHead>Ошибки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.campaigns.map((campaign: any) => {
                      const run = campaign.campaign_runs?.[0] || {};
                      return (
                        <TableRow key={campaign.id}>
                          <TableCell>{formatDateTime(campaign.created_at)}</TableCell>
                          <TableCell>{campaign.title}</TableCell>
                          <TableCell>{(campaign.channels || []).map((channel: string) => channelLabels[channel] || channel).join(", ")}</TableCell>
                          <TableCell><Badge variant="default">{statusLabels[campaign.status] || campaign.status}</Badge></TableCell>
                          <TableCell>{formatInt(run.sent)}</TableCell>
                          <TableCell>{formatInt(run.delivered)}</TableCell>
                          <TableCell>{formatInt(run.read)}</TableCell>
                          <TableCell>{formatInt(run.replied)}</TableCell>
                          <TableCell>{formatInt(run.booked)}</TableCell>
                          <TableCell>{formatInt(run.errors)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-12 bg-gradient-to-b from-transparent to-surface" />
              <div className="scrollbar-track" ref={campaignsTrackRef} onClick={handleCampaignsTrackClick}>
                <div
                  className="scrollbar-thumb"
                  ref={campaignsThumbRef}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    handleCampaignsThumbMouseDown(event);
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Автосистемы</CardTitle>
          <CardDescription>Результаты “не дозвонились” и “не был 50 дней”</CardDescription>
        </CardHeader>
        <CardContent>
          {data.automationRuns.length === 0 ? (
            <EmptyState title="Нет данных" description="automation_runs пока пустая" />
          ) : (
            <div className="relative max-h-[420px] min-h-[420px]">
              <div
                ref={automationScrollRef}
                className="max-h-[420px] min-h-[420px] overflow-y-scroll custom-scrollbar"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Система</TableHead>
                      <TableHead className="text-center">Отправлено</TableHead>
                      <TableHead className="text-center">Ответили</TableHead>
                      <TableHead className="text-center">Записались</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.automationRuns.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.day}</TableCell>
                        <TableCell>{row.automation_key}</TableCell>
                        <TableCell className="text-center">{formatInt(row.sent)}</TableCell>
                        <TableCell className="text-center">{formatInt(row.replied)}</TableCell>
                        <TableCell className="text-center">{formatInt(row.booked)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-12 bg-gradient-to-b from-transparent to-surface" />
              <div className="scrollbar-track" ref={automationTrackRef} onClick={handleAutomationTrackClick}>
                <div
                  className="scrollbar-thumb"
                  ref={automationThumbRef}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    handleAutomationThumbMouseDown(event);
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
