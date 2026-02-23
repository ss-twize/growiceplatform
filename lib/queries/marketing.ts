import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProfileOrgId, resolveDateRange, type BranchFilter, type PeriodFilter } from "@/lib/queries/common";

export async function fetchMarketingData(
  client: SupabaseClient<Database>,
  branch: BranchFilter,
  period: PeriodFilter,
  from?: string,
  to?: string
) {
  const orgId = await getProfileOrgId(client);
  const range = resolveDateRange(period, from, to);

  let campaignsQuery = client
    .from("campaigns")
    .select("id, title, message, channels, status, created_at, campaign_runs(*)")
    .eq("org_id", orgId)
    .gte("created_at", `${range.from}T00:00:00`)
    .lte("created_at", `${range.to}T23:59:59`)
    .order("created_at", { ascending: false });

  let automationQuery = client
    .from("automation_runs")
    .select("id, automation_key, day, sent, replied, booked, notes")
    .eq("org_id", orgId)
    .gte("day", range.from)
    .lte("day", range.to)
    .order("day", { ascending: false });

  if (branch !== "all") {
    campaignsQuery = campaignsQuery.or(`branch_id.eq.${branch},branch_id.is.null`);
    automationQuery = automationQuery.or(`branch_id.eq.${branch},branch_id.is.null`);
  }

  const settingsQuery = client.from("org_settings").select("tg_connected, wa_connected, max_connected").eq("org_id", orgId).single();

  let clientsQuery = client
    .from("clients")
    .select("id, full_name, phone, source, tags, created_at, client_channels(channel, last_message_at, username), appointments(service_name, start_at, price)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (branch !== "all") {
    clientsQuery = clientsQuery.eq("branch_id", branch);
  }

  const [
    { data: campaigns, error: campaignsError },
    { data: automationRuns, error: automationError },
    { data: settings, error: settingsError },
    { data: clients, error: clientsError }
  ] = await Promise.all([campaignsQuery, automationQuery, settingsQuery, clientsQuery]);

  if (campaignsError) {
    throw new Error(campaignsError.message);
  }

  if (automationError) {
    throw new Error(automationError.message);
  }

  if (settingsError && settingsError.code !== "PGRST116") {
    throw new Error(settingsError.message);
  }

  if (clientsError) {
    throw new Error(clientsError.message);
  }

  return {
    orgId,
    campaigns: campaigns || [],
    automationRuns: automationRuns || [],
    settings: settings || { tg_connected: false, wa_connected: false, max_connected: false },
    clients: clients || []
  };
}

export async function createCampaign(
  client: SupabaseClient<Database>,
  payload: {
    org_id: string;
    branch_id: string | null;
    title: string;
    message: string;
    channels: string[];
  }
) {
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Нет активной сессии");
  }

  const { data, error } = await client
    .from("campaigns")
    .insert({
      org_id: payload.org_id,
      branch_id: payload.branch_id,
      title: payload.title,
      message: payload.message,
      channels: payload.channels,
      created_by: user.id,
      status: "queued"
    })
    .select("id, org_id, branch_id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Не удалось создать кампанию");
  }

  return data;
}
