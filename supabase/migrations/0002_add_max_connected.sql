alter table public.org_settings
  add column if not exists max_connected boolean not null default false;
