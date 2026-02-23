import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getApiAuthContext() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 403 }) };
  }

  return {
    user,
    profile
  };
}
