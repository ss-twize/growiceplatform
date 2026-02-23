import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Next.js RSC may expose read-only cookies; middleware refreshes auth cookies.
          }
        },
        remove(name: string, options) {
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
