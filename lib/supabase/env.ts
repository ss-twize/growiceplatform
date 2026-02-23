const missingEnvMessage =
  "Supabase не настроен: добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local и перезапустите сервер.";

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(missingEnvMessage);
  }

  return { url, anonKey };
}

export { missingEnvMessage };
