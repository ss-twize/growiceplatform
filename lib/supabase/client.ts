import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  return createBrowserClient<Database>(url, anonKey);
}
