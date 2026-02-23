alter table public.clients enable row level security;
alter table public.client_channels enable row level security;
alter table public.services enable row level security;
alter table public.masters enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;

drop policy if exists clients_all_by_org on public.clients;
drop policy if exists client_channels_all_by_org on public.client_channels;
drop policy if exists services_all_by_org on public.services;
drop policy if exists masters_all_by_org on public.masters;
drop policy if exists conversations_all_by_org on public.conversations;
drop policy if exists messages_all_by_org on public.messages;
drop policy if exists appointments_all_by_org on public.appointments;

create policy clients_all_by_org on public.clients
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy client_channels_all_by_org on public.client_channels
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy services_all_by_org on public.services
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy masters_all_by_org on public.masters
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy conversations_all_by_org on public.conversations
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy messages_all_by_org on public.messages
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy appointments_all_by_org on public.appointments
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
