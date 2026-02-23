import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAuthContext } from "@/lib/auth/api-auth";
import { proxyToN8n } from "@/lib/n8n/proxy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  campaign_id: z.string().uuid(),
  org_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable()
});

export async function POST(request: Request) {
  try {
    const auth = await getApiAuthContext();
    if ("error" in auth) return auth.error;

    const payload = schema.parse(await request.json());

    if (payload.org_id !== auth.profile.org_id) {
      return NextResponse.json({ error: "Forbidden org" }, { status: 403 });
    }

    const supabase = createSupabaseServerClient();
    const { data: campaignExists, error: campaignCheckError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", payload.campaign_id)
      .eq("org_id", payload.org_id)
      .single();

    if (campaignCheckError || !campaignExists) {
      return NextResponse.json({ error: "Campaign not found in org scope" }, { status: 404 });
    }

    const url = process.env.N8N_LAUNCH_CAMPAIGN_URL;
    if (!url) {
      return NextResponse.json({ error: "N8N_LAUNCH_CAMPAIGN_URL is missing" }, { status: 500 });
    }

    const response = await proxyToN8n<typeof payload, { ok: boolean; run_id?: string }>({
      url,
      body: payload
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
