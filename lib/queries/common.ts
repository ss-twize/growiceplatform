import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type BranchFilter = string | "all";
export type PeriodFilter = "today" | "7d" | "30d" | "custom";

export type DateRange = {
  from: string;
  to: string;
};

export function resolveDateRange(period: PeriodFilter, from?: string, to?: string): DateRange {
  const today = new Date();
  const endInput = to ? new Date(to) : today;
  let start = new Date(endInput);
  let end = new Date(endInput);

  if (period === "today") {
    start = end;
  }

  if (period === "7d") {
    const day = end.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday as start
    start.setDate(end.getDate() - diff);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  if (period === "30d") {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }

  if (period === "custom" && from) {
    start = new Date(from);
    end = to ? new Date(to) : end;
  }

  return {
    from: toIsoDate(start),
    to: toIsoDate(end)
  };
}

export function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function startOfMonthIso() {
  const date = new Date();
  date.setDate(1);
  return toIsoDate(date);
}

export function toIsoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function applyBranchFilter<T extends { eq: (...args: any[]) => T; is: (...args: any[]) => T }>(
  query: T,
  branch: BranchFilter
): T {
  if (!branch || branch === "all") {
    return query.is("branch_id", null);
  }
  return query.eq("branch_id", branch);
}

export async function getProfileOrgId(client: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Необходимо войти в систему");
  }

  const { data, error } = await client
    .from("profiles")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw new Error("Профиль не найден");
  }

  return data.org_id;
}
