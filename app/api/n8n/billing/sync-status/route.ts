import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAuthContext } from "@/lib/auth/api-auth";
import { proxyToN8n } from "@/lib/n8n/proxy";

const schema = z.object({
  org_id: z.string().uuid(),
  operation_id: z.string().min(2)
});

export async function POST(request: Request) {
  try {
    const auth = await getApiAuthContext();
    if ("error" in auth) return auth.error;

    const payload = schema.parse(await request.json());

    if (payload.org_id !== auth.profile.org_id) {
      return NextResponse.json({ error: "Forbidden org" }, { status: 403 });
    }

    const url = process.env.N8N_BILLING_SYNC_STATUS_URL;
    if (!url) {
      return NextResponse.json({ error: "N8N_BILLING_SYNC_STATUS_URL is missing" }, { status: 500 });
    }

    const response = await proxyToN8n<typeof payload, { ok: boolean; status?: string }>({
      url,
      body: payload
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
