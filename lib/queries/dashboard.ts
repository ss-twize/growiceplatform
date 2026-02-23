import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  applyBranchFilter,
  enumerateDates,
  getProfileOrgId,
  resolveDateRange,
  startOfMonthIso,
  toIsoDate,
  type BranchFilter,
  type PeriodFilter
} from "@/lib/queries/common";

export type DashboardData = {
  todayKpi: Database["public"]["Tables"]["kpi_daily"]["Row"] | null;
  monthNewClients: number;
  rating: number;
  reviewsCount: number;
  subscription: Database["public"]["Tables"]["subscriptions"]["Row"] | null;
};

export async function fetchDashboardData(
  client: SupabaseClient<Database>,
  branch: BranchFilter,
  period: PeriodFilter,
  from?: string,
  to?: string
): Promise<DashboardData> {
  const orgId = await getProfileOrgId(client);
  const range = resolveDateRange(period, from, to);
  const today = period === "today" ? toIsoDate(new Date()) : range.to;

  const todayQuery = applyBranchFilter(
    client.from("kpi_daily").select("*").eq("org_id", orgId).eq("day", today).limit(1),
    branch
  );

  const monthQuery = applyBranchFilter(
    client
      .from("kpi_daily")
      .select("new_clients_month, day")
      .eq("org_id", orgId)
      .gte("day", startOfMonthIso())
      .order("day", { ascending: false })
      .limit(1),
    branch
  );

  const reviewsQuery = client
    .from("reviews_daily")
    .select("rating, reviews_count, day")
    .eq("org_id", orgId)
    .order("day", { ascending: false })
    .limit(1)
    .single();

  const subscriptionQuery = client
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const [{ data: todayRows }, { data: monthRows }, { data: reviews }, { data: subscription }] = await Promise.all([
    todayQuery,
    monthQuery,
    reviewsQuery,
    subscriptionQuery
  ]);

  return {
    todayKpi: todayRows?.[0] ?? null,
    monthNewClients: monthRows?.[0]?.new_clients_month ?? 0,
    rating: Number(reviews?.rating ?? 0),
    reviewsCount: reviews?.reviews_count ?? 0,
    subscription: subscription ?? null
  };
}

export async function fetchAnalyticsKpi(
  client: SupabaseClient<Database>,
  branch: BranchFilter,
  period: PeriodFilter,
  from?: string,
  to?: string
) {
  const orgId = await getProfileOrgId(client);
  const range = resolveDateRange(period, from, to);

  const query = applyBranchFilter(
    client
      .from("kpi_daily")
      .select(
        "day, unique_inquiries, total_messages, inbound_messages, outbound_messages, new_bookings, revenue, no_show_count, potential_revenue"
      )
      .eq("org_id", orgId)
      .gte("day", range.from)
      .lte("day", range.to)
      .order("day", { ascending: true }),
    branch
  );

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data || [];
  const map = new Map(rows.map((row) => [row.day, row]));
  const series = enumerateDates(range.from, range.to).map((day) => {
    const row = map.get(day);
    return (
      row || {
        day,
        unique_inquiries: 0,
        total_messages: 0,
        inbound_messages: 0,
        outbound_messages: 0,
        new_bookings: 0,
        revenue: 0,
        no_show_count: 0,
        potential_revenue: 0
      }
    );
  });

  return series;
}

export async function fetchServiceAnalytics(
  client: SupabaseClient<Database>,
  branch: BranchFilter,
  period: PeriodFilter,
  from?: string,
  to?: string
) {
  const orgId = await getProfileOrgId(client);
  const range = resolveDateRange(period, from, to);

  const query = applyBranchFilter(
    client
      .from("service_kpi_daily")
      .select("service_name, bookings_count, revenue, no_show_count")
      .eq("org_id", orgId)
      .gte("day", range.from)
      .lte("day", range.to),
    branch
  );

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const aggregated = new Map<
    string,
    { service_name: string; bookings_count: number; revenue: number; no_show_count: number }
  >();

  for (const row of data || []) {
    const current = aggregated.get(row.service_name) || {
      service_name: row.service_name,
      bookings_count: 0,
      revenue: 0,
      no_show_count: 0
    };
    current.bookings_count += row.bookings_count;
    current.revenue += Number(row.revenue);
    current.no_show_count += row.no_show_count;
    aggregated.set(row.service_name, current);
  }

  return Array.from(aggregated.values()).sort((a, b) => b.revenue - a.revenue);
}
