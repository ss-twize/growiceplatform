import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProfileOrgId } from "@/lib/queries/common";

export async function fetchBillingData(client: SupabaseClient<Database>) {
  const orgId = await getProfileOrgId(client);

  const [{ data: subscription, error: subError }, { data: payments, error: payError }, { data: settings }] = await Promise.all([
    client.from("subscriptions").select("*").eq("org_id", orgId).single(),
    client.from("payments").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(20),
    client.from("org_settings").select("tg_connected, wa_connected, max_connected").eq("org_id", orgId).single()
  ]);

  if (subError && subError.code !== "PGRST116") {
    throw new Error(subError.message);
  }

  if (payError) {
    throw new Error(payError.message);
  }

  return {
    orgId,
    subscription: subscription || null,
    payments: payments || [],
    settings: settings || null
  };
}
