"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, CreditCard, LayoutDashboard, LineChart, Megaphone, Settings, LogOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppFilters } from "@/lib/hooks/use-app-filters";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatInt } from "@/lib/format";

export type BranchItem = {
  id: string;
  name: string;
};

type AppShellProps = {
  children: ReactNode;
  orgId: string;
  orgName: string;
  role: "owner" | "admin";
  userEmail: string;
  branches: BranchItem[];
  defaultBranchId: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/analytics", label: "Аналитика", icon: LineChart },
  { href: "/marketing", label: "Клиенты и Рассылка", icon: Megaphone },
  { href: "/billing", label: "Система и оплата", icon: CreditCard },
  { href: "/settings", label: "Настройки", icon: Settings }
];

export function AppShell({ children, orgId, orgName, role, userEmail, branches, defaultBranchId }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useAppFilters(defaultBranchId);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rating, setRating] = useState<{ value: number; count: number } | null>(null);

  const periodOptions = [
    { value: "today", label: "Сегодня" },
    { value: "7d", label: "Неделя" },
    { value: "30d", label: "Месяц" },
    { value: "custom", label: "Кастом" }
  ];

  const branchOptions = branches.length
    ? [{ value: branches[0].id, label: branches[0].name }]
    : [{ value: "all", label: "Основной филиал" }];

  const preservedQuery = new URLSearchParams(searchParams.toString());
  const queryString = preservedQuery.toString();
  const selectedBranchLabel =
    branchOptions.find((option) => option.value === filters.branch)?.label || branchOptions[0]?.label || "Филиал";

  useEffect(() => {
    const hasBranch = searchParams.has("branch");
    const hasPeriod = searchParams.has("period");
    if (!hasBranch || !hasPeriod) {
      filters.setFilter({
        branch: hasBranch
          ? searchParams.get("branch") || ""
          : branches[0]?.id ?? defaultBranchId ?? "all",
        period: hasPeriod ? searchParams.get("period") || "" : "30d"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRating() {
      const { data, error } = await supabase
        .from("reviews_daily")
        .select("rating, reviews_count, day")
        .eq("org_id", orgId)
        .order("day", { ascending: false });

      if (!active) return;
      if (error || !data || data.length === 0) {
        setRating({ value: 0, count: 0 });
        return;
      }

      const latestDay = data[0].day;
      const latestRows = data.filter((row) => row.day === latestDay);
      const average = latestRows.reduce((sum, row) => sum + Number(row.rating), 0) / latestRows.length;
      const count = latestRows.reduce((sum, row) => sum + row.reviews_count, 0);
      setRating({ value: Number.isFinite(average) ? average : 0, count });
    }

    loadRating();

    return () => {
      active = false;
    };
  }, [orgId, filters.branch, supabase]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="flex h-screen overflow-hidden">
        <aside className="h-screen w-[260px] shrink-0 overflow-y-auto border-r border-black bg-[#001B1B] p-5">
          <div className="mb-0 flex items-center gap-2">
            <Building2 className="size-5 text-accent" />
            <span className="font-display text-2xl font-bold italic tracking-wide text-[#00E378]">GROWICE</span>
          </div>
          <p className="mt-1 mb-6 text-xs italic text-white">Когда важен качественный клиентский сервис</p>

          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={queryString ? `${href}?${queryString}` : href}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm text-muted transition",
                  pathname === href ? "border-border bg-black text-white" : "hover:bg-black/80"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-black bg-[#001B1B] px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-base font-semibold text-white">{selectedBranchLabel}</span>
                <div className="flex items-center gap-2 rounded-md border border-border bg-black px-3 py-2 text-sm">
                  <Star className="size-4 text-accent" />
                  <span>Рейтинг: {rating ? rating.value.toFixed(2) : "—"}</span>
                  <Badge variant="default">{formatInt(rating?.count ?? 0)}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="w-[170px]">
                <Select
                  value={filters.period}
                  options={periodOptions}
                  onChange={(event) => filters.setFilter({ period: event.target.value })}
                />
                </div>

                {filters.period === "custom" && (
                  <>
                    <input
                      type="date"
                      className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
                      value={filters.from}
                      onChange={(event) => filters.setFilter({ from: event.target.value })}
                    />
                    <input
                      type="date"
                      className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
                      value={filters.to}
                      onChange={(event) => filters.setFilter({ to: event.target.value })}
                    />
                  </>
                )}

                <Button variant="outline" onClick={() => router.push("/analytics")}>Экспорт XLS</Button>
                <Button variant="ghost" className="gap-2" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Выйти
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
