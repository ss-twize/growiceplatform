import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getProfileOrgId } from "@/lib/queries/common";

export async function fetchSettingsData(client: SupabaseClient<Database>) {
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Необходимо войти");
  }

  const orgId = await getProfileOrgId(client);

  const [{ data: profile }, { data: org }, { data: branches }] = await Promise.all([
    client.from("profiles").select("full_name, phone, role, org_id").eq("user_id", user.id).single(),
    client.from("orgs").select("id, name").eq("id", orgId).single(),
    client.from("branches").select("id, name, address").eq("org_id", orgId).order("name")
  ]);

  return {
    profile,
    org,
    branches: branches || []
  };
}
