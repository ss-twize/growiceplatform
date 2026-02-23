import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAuthContext } from "@/lib/auth/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { proxyToN8n } from "@/lib/n8n/proxy";

const schema = z.object({
  org_id: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1),
  success_url: z.string().url(),
  fail_url: z.string().url()
});

export async function POST(request: Request) {
  try {
    const auth = await getApiAuthContext();
    if ("error" in auth) return auth.error;

    const payload = schema.parse(await request.json());
    if (payload.org_id !== auth.profile.org_id) {
      return NextResponse.json({ error: "Forbidden org" }, { status: 403 });
    }

    const url = process.env.N8N_BILLING_CREATE_LINK_URL;
    if (!url) {
      return NextResponse.json({ error: "N8N_BILLING_CREATE_LINK_URL is missing" }, { status: 500 });
    }

    const n8nResponse = await proxyToN8n<typeof payload, { payment_url: string; operation_id: string }>({
      url,
      body: payload
    });

    const admin = createSupabaseAdminClient();

    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .upsert(
        {
          org_id: payload.org_id,
          last_payment_url: n8nResponse.payment_url,
          last_payment_operation_id: n8nResponse.operation_id,
          updated_at: new Date().toISOString()
        },
        { onConflict: "org_id" }
      );

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    const { error: paymentError } = await admin.from("payments").insert({
      org_id: payload.org_id,
      provider: "tochka",
      operation_id: n8nResponse.operation_id,
      amount: payload.amount,
      status: "created"
    });

    if (paymentError) {
      throw new Error(paymentError.message);
    }

    return NextResponse.json(n8nResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
