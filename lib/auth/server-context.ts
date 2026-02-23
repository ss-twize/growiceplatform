import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthContext = {
  userId: string;
  email: string;
  profile: {
    org_id: string;
    role: "owner" | "admin";
    full_name: string | null;
    phone: string | null;
  };
  org: {
    id: string;
    name: string;
  };
  branches: Array<{ id: string; name: string }>;
  settings: {
    default_branch_id: string | null;
  };
};

export async function getRequiredAuthContext(): Promise<AuthContext> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id, role, full_name, phone")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  const [{ data: org }, { data: branches }, { data: settings }] = await Promise.all([
    supabase.from("orgs").select("id, name").eq("id", profile.org_id).single(),
    supabase.from("branches").select("id, name").eq("org_id", profile.org_id).order("name"),
    supabase.from("org_settings").select("default_branch_id").eq("org_id", profile.org_id).single()
  ]);

  if (!org) {
    redirect("/login");
  }

  return {
    userId: user.id,
    email: user.email || "",
    profile,
    org,
    branches: branches || [],
    settings: settings || { default_branch_id: null }
  };
}
