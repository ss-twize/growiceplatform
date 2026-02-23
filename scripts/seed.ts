import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const raw = readFileSync(".env.local", "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seed");
}

const supabase = createClient(url, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const OWNER_EMAIL = "owner@demo.ru";
const OWNER_PHONE = "79990001122";
const OWNER_ALIAS_EMAIL = `${OWNER_PHONE}@login.wisery.local`;
const OWNER_PASSWORD = "Demo12345!";

async function ensureUser(email: string, password: string, fullName: string) {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    return existing.id;
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });

  if (created.error || !created.data.user) {
    throw new Error(created.error?.message || `Cannot create user ${email}`);
  }

  return created.data.user.id;
}

async function main() {
  console.log("Seeding wisery-cabinet...");

  const ownerUserId = await ensureUser(OWNER_EMAIL, OWNER_PASSWORD, "Демо владелец");
  const ownerAliasUserId = await ensureUser(OWNER_ALIAS_EMAIL, OWNER_PASSWORD, "Демо владелец (телефон)");

  const { data: orgExisting } = await supabase.from("orgs").select("id").eq("name", "Демо салон").maybeSingle();

  let orgId = orgExisting?.id;
  if (!orgId) {
    const orgInsert = await supabase.from("orgs").insert({ name: "Демо салон" }).select("id").single();
    if (orgInsert.error || !orgInsert.data) throw new Error(orgInsert.error?.message || "Cannot insert org");
    orgId = orgInsert.data.id;
  }

  const existingBranches = await supabase.from("branches").select("id, name").eq("org_id", orgId);

  let branch1 = existingBranches.data?.find((b) => b.name === "Центр");
  let branch2 = existingBranches.data?.find((b) => b.name === "Север");

  if (!branch1) {
    const inserted = await supabase
      .from("branches")
      .insert({ org_id: orgId, name: "Центр", address: "Москва, Тверская 1" })
      .select("id, name")
      .single();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message || "Cannot insert branch1");
    branch1 = inserted.data;
  }

  if (!branch2) {
    const inserted = await supabase
      .from("branches")
      .insert({ org_id: orgId, name: "Север", address: "Москва, Ленинградский 12" })
      .select("id, name")
      .single();
    if (inserted.error || !inserted.data) throw new Error(inserted.error?.message || "Cannot insert branch2");
    branch2 = inserted.data;
  }

  await supabase.from("profiles").upsert(
    [
      {
        user_id: ownerUserId,
        org_id: orgId,
        phone: null,
        full_name: "Демо владелец",
        role: "owner"
      },
      {
        user_id: ownerAliasUserId,
        org_id: orgId,
        phone: "+79990001122",
        full_name: "Демо владелец (телефон)",
        role: "owner"
      }
    ],
    { onConflict: "user_id" }
  );

  await supabase.from("org_settings").upsert(
    {
      org_id: orgId,
      default_branch_id: branch1.id,
      tg_connected: true,
      wa_connected: true,
      max_connected: false,
      updated_at: new Date().toISOString()
    },
    { onConflict: "org_id" }
  );

  const today = new Date();
  const toIso = (date: Date) => date.toISOString().slice(0, 10);

  await Promise.all([
    supabase.from("kpi_daily").delete().eq("org_id", orgId),
    supabase.from("service_kpi_daily").delete().eq("org_id", orgId),
    supabase.from("reviews_daily").delete().eq("org_id", orgId),
    supabase.from("automation_runs").delete().eq("org_id", orgId),
    supabase.from("campaigns").delete().eq("org_id", orgId),
    supabase.from("payments").delete().eq("org_id", orgId)
  ]);

  const kpiRows: any[] = [];
  const serviceRows: any[] = [];
  const reviewRows: any[] = [];
  const automationRows: any[] = [];

  for (let i = 0; i < 30; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const dayStr = toIso(day);

    const b1Inquiries = 18 + Math.floor(Math.random() * 14);
    const b2Inquiries = 12 + Math.floor(Math.random() * 12);
    const b1Messages = b1Inquiries * 4 + Math.floor(Math.random() * 20);
    const b2Messages = b2Inquiries * 4 + Math.floor(Math.random() * 18);
    const b1Bookings = 8 + Math.floor(Math.random() * 8);
    const b2Bookings = 5 + Math.floor(Math.random() * 7);
    const b1Revenue = b1Bookings * (2500 + Math.floor(Math.random() * 1800));
    const b2Revenue = b2Bookings * (2100 + Math.floor(Math.random() * 1600));
    const b1Potential = b1Revenue + 3000 + Math.floor(Math.random() * 5000);
    const b2Potential = b2Revenue + 2500 + Math.floor(Math.random() * 4500);

    kpiRows.push(
      {
        org_id: orgId,
        branch_id: branch1.id,
        day: dayStr,
        unique_inquiries: b1Inquiries,
        total_messages: b1Messages,
        inbound_messages: Math.floor(b1Messages * 0.56),
        outbound_messages: Math.floor(b1Messages * 0.44),
        new_bookings: b1Bookings,
        revenue: b1Revenue,
        potential_revenue: b1Potential,
        no_show_count: Math.floor(Math.random() * 4),
        new_clients_month: 18 + Math.floor(Math.random() * 7)
      },
      {
        org_id: orgId,
        branch_id: branch2.id,
        day: dayStr,
        unique_inquiries: b2Inquiries,
        total_messages: b2Messages,
        inbound_messages: Math.floor(b2Messages * 0.58),
        outbound_messages: Math.floor(b2Messages * 0.42),
        new_bookings: b2Bookings,
        revenue: b2Revenue,
        potential_revenue: b2Potential,
        no_show_count: Math.floor(Math.random() * 3),
        new_clients_month: 11 + Math.floor(Math.random() * 5)
      },
      {
        org_id: orgId,
        branch_id: null,
        day: dayStr,
        unique_inquiries: b1Inquiries + b2Inquiries,
        total_messages: b1Messages + b2Messages,
        inbound_messages: Math.floor((b1Messages + b2Messages) * 0.57),
        outbound_messages: Math.floor((b1Messages + b2Messages) * 0.43),
        new_bookings: b1Bookings + b2Bookings,
        revenue: b1Revenue + b2Revenue,
        potential_revenue: b1Potential + b2Potential,
        no_show_count: Math.floor(Math.random() * 6),
        new_clients_month: 31 + Math.floor(Math.random() * 12)
      }
    );

    serviceRows.push(
      {
        org_id: orgId,
        branch_id: branch1.id,
        day: dayStr,
        service_name: "Окрашивание",
        bookings_count: 4 + Math.floor(Math.random() * 3),
        revenue: 12000 + Math.floor(Math.random() * 8000),
        no_show_count: Math.floor(Math.random() * 2)
      },
      {
        org_id: orgId,
        branch_id: branch1.id,
        day: dayStr,
        service_name: "Маникюр",
        bookings_count: 5 + Math.floor(Math.random() * 5),
        revenue: 7000 + Math.floor(Math.random() * 5000),
        no_show_count: Math.floor(Math.random() * 2)
      },
      {
        org_id: orgId,
        branch_id: branch2.id,
        day: dayStr,
        service_name: "Психологическая консультация",
        bookings_count: 3 + Math.floor(Math.random() * 4),
        revenue: 9000 + Math.floor(Math.random() * 7000),
        no_show_count: Math.floor(Math.random() * 2)
      }
    );

    reviewRows.push({
      org_id: orgId,
      source: "yandex",
      day: dayStr,
      rating: (4.2 + Math.random() * 0.7).toFixed(2),
      reviews_count: 120 + i
    });

    if (i < 10) {
      automationRows.push(
        {
          org_id: orgId,
          branch_id: null,
          automation_key: "no_answer_call",
          day: dayStr,
          sent: 8 + Math.floor(Math.random() * 10),
          replied: 1 + Math.floor(Math.random() * 4),
          booked: 1 + Math.floor(Math.random() * 3),
          notes: { source: "n8n" }
        },
        {
          org_id: orgId,
          branch_id: null,
          automation_key: "inactive_50_days",
          day: dayStr,
          sent: 5 + Math.floor(Math.random() * 8),
          replied: 1 + Math.floor(Math.random() * 3),
          booked: Math.floor(Math.random() * 3),
          notes: { source: "n8n" }
        }
      );
    }
  }

  const { error: kpiError } = await supabase.from("kpi_daily").insert(kpiRows);
  if (kpiError) throw new Error(kpiError.message);

  const { error: serviceError } = await supabase.from("service_kpi_daily").insert(serviceRows);
  if (serviceError) throw new Error(serviceError.message);

  const { error: reviewError } = await supabase.from("reviews_daily").insert(reviewRows);
  if (reviewError) throw new Error(reviewError.message);

  const { error: autoError } = await supabase.from("automation_runs").insert(automationRows);
  if (autoError) throw new Error(autoError.message);

  const campaignsInsert = await supabase
    .from("campaigns")
    .insert([
      {
        org_id: orgId,
        branch_id: branch1.id,
        title: "Напоминание о визите",
        message: "Подтвердите запись на завтра",
        channels: ["telegram", "whatsapp"],
        status: "done",
        created_by: ownerUserId
      },
      {
        org_id: orgId,
        branch_id: null,
        title: "Возврат клиентов 50+ дней",
        message: "Дарим -10% на повторный визит",
        channels: ["telegram", "sms"],
        status: "running",
        created_by: ownerUserId
      }
    ])
    .select("id, status");

  if (campaignsInsert.error || !campaignsInsert.data) {
    throw new Error(campaignsInsert.error?.message || "Cannot insert campaigns");
  }

  const runRows = campaignsInsert.data.map((campaign, idx) => ({
    campaign_id: campaign.id,
    status: campaign.status,
    sent: idx === 0 ? 120 : 90,
    delivered: idx === 0 ? 114 : 76,
    read: idx === 0 ? 98 : 54,
    replied: idx === 0 ? 31 : 19,
    booked: idx === 0 ? 17 : 12,
    errors: idx === 0 ? 3 : 8,
    details: { seed: true }
  }));

  const { error: runsError } = await supabase.from("campaign_runs").insert(runRows);
  if (runsError) throw new Error(runsError.message);

  const paidUntil = new Date();
  paidUntil.setDate(paidUntil.getDate() + 5);

  await supabase
    .from("subscriptions")
    .upsert(
      {
        org_id: orgId,
        plan: "standard",
        status: "active",
        paid_until: paidUntil.toISOString().slice(0, 10),
        last_payment_url: "https://pay.tochka.example/demo",
        last_payment_operation_id: "op_demo_001",
        updated_at: new Date().toISOString()
      },
      { onConflict: "org_id" }
    );

  await supabase.from("payments").insert([
    {
      org_id: orgId,
      provider: "tochka",
      operation_id: "op_demo_001",
      amount: 5900,
      status: "paid",
      paid_at: new Date().toISOString()
    },
    {
      org_id: orgId,
      provider: "tochka",
      operation_id: "op_demo_002",
      amount: 5900,
      status: "created"
    }
  ]);

  console.log("Seed complete");
  console.log("Owner email login:", OWNER_EMAIL, OWNER_PASSWORD);
  console.log("Phone alias login:", OWNER_ALIAS_EMAIL, OWNER_PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
