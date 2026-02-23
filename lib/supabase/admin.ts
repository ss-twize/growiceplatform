import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY или NEXT_PUBLIC_SUPABASE_URL не настроены");
  }

  return createClient<Database>(url, serviceRole, {
    auth: {
      persistSession: false
    }
  });
}
