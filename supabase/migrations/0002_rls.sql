create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_org_id() to authenticated;

alter table public.orgs enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.org_settings enable row level security;
alter table public.kpi_daily enable row level security;
alter table public.service_kpi_daily enable row level security;
alter table public.reviews_daily enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_runs enable row level security;
alter table public.automation_runs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

drop policy if exists orgs_all_by_org on public.orgs;
drop policy if exists branches_all_by_org on public.branches;
drop policy if exists profiles_all_by_org on public.profiles;
drop policy if exists org_settings_all_by_org on public.org_settings;
drop policy if exists kpi_daily_all_by_org on public.kpi_daily;
drop policy if exists service_kpi_daily_all_by_org on public.service_kpi_daily;
drop policy if exists reviews_daily_all_by_org on public.reviews_daily;
drop policy if exists campaigns_all_by_org on public.campaigns;
drop policy if exists campaign_runs_all_by_org on public.campaign_runs;
drop policy if exists automation_runs_all_by_org on public.automation_runs;
drop policy if exists subscriptions_all_by_org on public.subscriptions;
drop policy if exists payments_all_by_org on public.payments;

create policy orgs_all_by_org on public.orgs
  for all
  to authenticated
  using (id = public.current_org_id())
  with check (id = public.current_org_id());

create policy branches_all_by_org on public.branches
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy profiles_all_by_org on public.profiles
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy org_settings_all_by_org on public.org_settings
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy kpi_daily_all_by_org on public.kpi_daily
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy service_kpi_daily_all_by_org on public.service_kpi_daily
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy reviews_daily_all_by_org on public.reviews_daily
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy campaigns_all_by_org on public.campaigns
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy campaign_runs_all_by_org on public.campaign_runs
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = campaign_runs.campaign_id
        and c.org_id = public.current_org_id()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = campaign_runs.campaign_id
        and c.org_id = public.current_org_id()
    )
  );

create policy automation_runs_all_by_org on public.automation_runs
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy subscriptions_all_by_org on public.subscriptions
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy payments_all_by_org on public.payments
  for all
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
