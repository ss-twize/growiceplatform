create extension if not exists pgcrypto;

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  phone text unique,
  full_name text,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.org_settings (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  default_branch_id uuid references public.branches(id),
  tg_connected boolean not null default false,
  wa_connected boolean not null default false,
  updated_at timestamptz not null default now()
);

-- branch_id = null означает агрегат по всем филиалам.
-- Для защиты от дублей используется уникальный индекс с coalesce(branch_id).
create table if not exists public.kpi_daily (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  day date not null,
  unique_inquiries int not null default 0,
  total_messages int not null default 0,
  inbound_messages int not null default 0,
  outbound_messages int not null default 0,
  new_bookings int not null default 0,
  revenue numeric(12,2) not null default 0,
  potential_revenue numeric(12,2) not null default 0,
  no_show_count int not null default 0,
  new_clients_month int not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists kpi_daily_org_branch_day_unique
  on public.kpi_daily (org_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), day);

create table if not exists public.service_kpi_daily (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  day date not null,
  service_name text not null,
  bookings_count int not null default 0,
  revenue numeric(12,2) not null default 0,
  no_show_count int not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists service_kpi_daily_org_branch_day_service_unique
  on public.service_kpi_daily (org_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), day, service_name);

create table if not exists public.reviews_daily (
  org_id uuid not null references public.orgs(id) on delete cascade,
  source text not null default 'yandex',
  day date not null,
  rating numeric(3,2) not null default 0,
  reviews_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, source, day)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  title text not null,
  message text not null,
  channels text[] not null,
  status text not null default 'draft' check (status in ('draft', 'queued', 'running', 'done', 'failed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  sent int not null default 0,
  delivered int not null default 0,
  read int not null default 0,
  replied int not null default 0,
  booked int not null default 0,
  errors int not null default 0,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  automation_key text not null,
  day date not null,
  sent int not null default 0,
  replied int not null default 0,
  booked int not null default 0,
  notes jsonb not null default '{}'::jsonb
);

create table if not exists public.subscriptions (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  plan text not null default 'standard',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'canceled')),
  paid_until date,
  last_payment_url text,
  last_payment_operation_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  provider text not null default 'tochka',
  operation_id text not null,
  amount numeric(12,2) not null,
  status text not null check (status in ('created', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_kpi_daily_org_branch_day_desc on public.kpi_daily (org_id, branch_id, day desc);
create index if not exists idx_reviews_daily_org_source_day_desc on public.reviews_daily (org_id, source, day desc);
create index if not exists idx_campaigns_org_branch_created_desc on public.campaigns (org_id, branch_id, created_at desc);
create index if not exists idx_automation_runs_org_branch_day_desc on public.automation_runs (org_id, branch_id, day desc);
create index if not exists idx_payments_org_created_desc on public.payments (org_id, created_at desc);
create index if not exists idx_campaign_runs_campaign on public.campaign_runs (campaign_id, started_at desc);
