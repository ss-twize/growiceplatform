import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Next.js RSC may expose read-only cookies; middleware refreshes auth cookies.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Next.js RSC may expose read-only cookies; middleware refreshes auth cookies.
          }
        }
      }
    }
  );
}
