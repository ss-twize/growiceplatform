create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text,
  phone text,
  email text,
  tags text[] not null default '{}'::text[],
  source text not null default 'manual',
  first_booking_at timestamptz,
  last_booking_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists clients_org_phone_unique on public.clients (org_id, phone);

create table if not exists public.client_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null,
  chat_id text not null,
  username text,
  display_name text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  next_visit_at timestamptz
);

create unique index if not exists client_channels_org_channel_chat_unique on public.client_channels (org_id, channel, chat_id);
create index if not exists client_channels_client_idx on public.client_channels (client_id);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  service_key text,
  service_name text not null,
  duration_min int,
  price_rub numeric(12,2),
  upsell_service_id uuid references public.services(id) on delete set null
);

create table if not exists public.masters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  telegram text,
  whatsapp text,
  master_key text,
  calendar_id text,
  work_days text,
  work_start time,
  work_end time
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  channel text not null,
  status text not null default 'open' check (status in ('open','resolved','spam')),
  assigned_to uuid references public.profiles(user_id) on delete set null,
  started_at timestamptz not null default now(),
  last_message_at timestamptz
);

create index if not exists conversations_org_channel_idx on public.conversations (org_id, channel, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('client','bot','agent','admin')),
  direction text not null check (direction in ('in','out')),
  content text not null,
  created_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  master_id uuid references public.masters(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz,
  duration_min int,
  price numeric(12,2),
  status text not null check (status in ('scheduled','approved','completed','canceled','no_show')),
  source text not null default 'manual',
  external_id text,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_org_start_idx on public.appointments (org_id, start_at desc);
