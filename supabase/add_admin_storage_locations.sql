create extension if not exists pgcrypto;

alter table public.workspace_members
  add column if not exists role text not null default 'member';

alter table public.workspace_members
  add column if not exists receives_order_digest boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_members_role_check'
      and conrelid = 'public.workspace_members'::regclass
  ) then
    alter table public.workspace_members
      add constraint workspace_members_role_check
      check (role in ('member', 'admin'));
  end if;
end;
$$;

create or replace function public.is_workspace_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members members
    where lower(members.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

create or replace function public.is_workspace_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members members
    where lower(members.email) = lower(coalesce(auth.jwt()->>'email', ''))
      and members.role = 'admin'
  );
$$;

create table if not exists public.storage_locations (
  id text primary key default ('loc_' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  details text not null default '',
  detail_fields jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.storage_locations
  add column if not exists detail_fields jsonb not null default '[]'::jsonb;

create unique index if not exists storage_locations_name_lower_idx
  on public.storage_locations (lower(name));

drop trigger if exists storage_locations_set_updated_at on public.storage_locations;
create trigger storage_locations_set_updated_at
before update on public.storage_locations
for each row
execute function public.set_updated_at();

alter table public.storage_locations enable row level security;

drop policy if exists "Admins can manage workspace members" on public.workspace_members;
create policy "Admins can manage workspace members"
on public.workspace_members
for all
to authenticated
using (public.is_workspace_admin())
with check (public.is_workspace_admin());

drop policy if exists "Approved members can read storage locations" on public.storage_locations;
create policy "Approved members can read storage locations"
on public.storage_locations
for select
to authenticated
using (public.is_workspace_member());

drop policy if exists "Admins can insert storage locations" on public.storage_locations;
create policy "Admins can insert storage locations"
on public.storage_locations
for insert
to authenticated
with check (public.is_workspace_admin());

drop policy if exists "Admins can update storage locations" on public.storage_locations;
create policy "Admins can update storage locations"
on public.storage_locations
for update
to authenticated
using (public.is_workspace_admin())
with check (public.is_workspace_admin());

drop policy if exists "Admins can delete storage locations" on public.storage_locations;
create policy "Admins can delete storage locations"
on public.storage_locations
for delete
to authenticated
using (public.is_workspace_admin());

insert into public.storage_locations (name, details, sort_order, is_active)
values
  ('-30℃冷凍庫(白色)', '', 10, true),
  ('-30℃冷凍庫（番号34）', '', 20, true),
  ('-30℃冷凍庫（番号35）', '', 30, true),
  ('-30℃冷凍庫（番号36）', '', 40, true),
  ('-30℃冷凍庫（番号37）', '', 50, true),
  ('-80℃冷凍庫44', '', 60, true),
  ('-80℃冷凍庫45', '', 70, true),
  ('-80℃冷凍庫46', '', 80, true),
  ('4℃冷蔵庫（番号16）', '', 90, true),
  ('4℃冷蔵庫（番号17）', '', 100, true),
  ('4℃冷蔵庫（番号31）', '', 110, true),
  ('4℃冷蔵庫（番号32）', '', 120, true),
  ('4℃冷蔵庫（番号33）', '', 130, true),
  ('4℃冷蔵庫（番号4、培養室）', '', 140, true),
  ('4℃冷蔵庫（番号5、培養室）', '', 150, true),
  ('共通試薬棚（培養室前）', '', 160, true),
  ('外劇物保管棚（ブルー）', '', 170, true),
  ('液体窒素A', '', 180, true),
  ('液体窒素B', '', 190, true),
  ('液体窒素C', '', 200, true),
  ('液体窒素D', '', 210, true),
  ('液体窒素E', '', 220, true),
  ('鍵付きボックス（ビール瓶の鍵）', '', 230, true)
on conflict do nothing;

insert into public.workspace_members (email, role)
values ('ryo-okamuvn115@g.ecc.u-tokyo.ac.jp', 'admin')
on conflict (email) do update
set role = 'admin';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'storage_locations'
  ) then
    alter publication supabase_realtime add table public.storage_locations;
  end if;
end;
$$;
