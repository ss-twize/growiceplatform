const missingEnvMessage =
  "Supabase не настроен: добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY (или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) в .env.local и перезапустите сервер.";

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabasePublicEnv() {
  const env = readSupabasePublicEnv();

  if (!env) {
    throw new Error(missingEnvMessage);
  }

  return env;
}

export { missingEnvMessage };
