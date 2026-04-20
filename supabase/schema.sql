create extension if not exists pgcrypto;

create table if not exists public.workspace_members (
  email text primary key,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.workspace_members
  add column if not exists role text not null default 'member';

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

create unique index if not exists workspace_members_email_lower_idx
  on public.workspace_members (lower(email));

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.inventory_items (
  id text primary key default ('inv_' || replace(gen_random_uuid()::text, '-', '')),
  name text not null,
  category text not null check (category in ('protein', 'antibody', 'reagent', 'plasmid', 'other')),
  quantity double precision not null default 0 check (quantity >= 0),
  unit text not null,
  min_quantity double precision not null default 0 check (min_quantity >= 0),
  expiry_date date,
  supplier text not null default 'other',
  location text not null default '',
  location_preset text not null default '',
  location_field_values jsonb not null default '[]'::jsonb,
  location_detail text not null default '',
  location_image_path text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

create unique index if not exists storage_locations_name_lower_idx
  on public.storage_locations (lower(name));

alter table public.inventory_items
  add column if not exists supplier text not null default 'other';

alter table public.inventory_items
  add column if not exists location_preset text not null default '';

alter table public.inventory_items
  add column if not exists location_field_values jsonb not null default '[]'::jsonb;

alter table public.inventory_items
  add column if not exists location_detail text not null default '';

alter table public.inventory_items
  add column if not exists location_image_path text not null default '';

alter table public.storage_locations
  add column if not exists detail_fields jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_items_supplier_check'
      and conrelid = 'public.inventory_items'::regclass
  ) then
    alter table public.inventory_items
      add constraint inventory_items_supplier_check
      check (supplier in ('tone-kagaku', 'ikeda-rika', 'yaken', 'ut', 'other'));
  end if;
end;
$$;

create table if not exists public.orders (
  id text primary key default ('ord_' || replace(gen_random_uuid()::text, '-', '')),
  order_number text not null,
  items jsonb not null default '[]'::jsonb,
  total_amount double precision not null default 0,
  status text not null check (status in ('draft', 'submitted', 'approved', 'received')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.protocols (
  id text primary key default ('prot_' || replace(gen_random_uuid()::text, '-', '')),
  title text not null,
  category text not null,
  description text not null default '',
  steps jsonb not null default '[]'::jsonb,
  estimated_time text not null default '',
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row
execute function public.set_updated_at();

drop trigger if exists storage_locations_set_updated_at on public.storage_locations;
create trigger storage_locations_set_updated_at
before update on public.storage_locations
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists protocols_set_updated_at on public.protocols;
create trigger protocols_set_updated_at
before update on public.protocols
for each row
execute function public.set_updated_at();

alter table public.workspace_members enable row level security;
alter table public.inventory_items enable row level security;
alter table public.storage_locations enable row level security;
alter table public.orders enable row level security;
alter table public.protocols enable row level security;

drop policy if exists "Members can view their own allowlist row" on public.workspace_members;
create policy "Members can view their own allowlist row"
on public.workspace_members
for select
to authenticated
using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

drop policy if exists "Admins can manage workspace members" on public.workspace_members;
create policy "Admins can manage workspace members"
on public.workspace_members
for all
to authenticated
using (public.is_workspace_admin())
with check (public.is_workspace_admin());

drop policy if exists "Approved members can read inventory" on public.inventory_items;
create policy "Approved members can read inventory"
on public.inventory_items
for select
to authenticated
using (public.is_workspace_member());

drop policy if exists "Approved members can insert inventory" on public.inventory_items;
create policy "Approved members can insert inventory"
on public.inventory_items
for insert
to authenticated
with check (public.is_workspace_member());

drop policy if exists "Approved members can update inventory" on public.inventory_items;
create policy "Approved members can update inventory"
on public.inventory_items
for update
to authenticated
using (public.is_workspace_member())
with check (public.is_workspace_member());

drop policy if exists "Approved members can delete inventory" on public.inventory_items;
create policy "Approved members can delete inventory"
on public.inventory_items
for delete
to authenticated
using (public.is_workspace_member());

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

drop policy if exists "Approved members can read orders" on public.orders;
create policy "Approved members can read orders"
on public.orders
for select
to authenticated
using (public.is_workspace_member());

drop policy if exists "Approved members can insert orders" on public.orders;
create policy "Approved members can insert orders"
on public.orders
for insert
to authenticated
with check (public.is_workspace_member());

drop policy if exists "Approved members can update orders" on public.orders;
create policy "Approved members can update orders"
on public.orders
for update
to authenticated
using (public.is_workspace_member())
with check (public.is_workspace_member());

drop policy if exists "Approved members can delete orders" on public.orders;
create policy "Approved members can delete orders"
on public.orders
for delete
to authenticated
using (public.is_workspace_member());

drop policy if exists "Approved members can read protocols" on public.protocols;
create policy "Approved members can read protocols"
on public.protocols
for select
to authenticated
using (public.is_workspace_member());

drop policy if exists "Approved members can insert protocols" on public.protocols;
create policy "Approved members can insert protocols"
on public.protocols
for insert
to authenticated
with check (public.is_workspace_member());

drop policy if exists "Approved members can update protocols" on public.protocols;
create policy "Approved members can update protocols"
on public.protocols
for update
to authenticated
using (public.is_workspace_member())
with check (public.is_workspace_member());

drop policy if exists "Approved members can delete protocols" on public.protocols;
create policy "Approved members can delete protocols"
on public.protocols
for delete
to authenticated
using (public.is_workspace_member());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventory-location-images',
  'inventory-location-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Approved members can view inventory location images" on storage.objects;
create policy "Approved members can view inventory location images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inventory-location-images'
  and public.is_workspace_member()
);

drop policy if exists "Approved members can upload inventory location images" on storage.objects;
create policy "Approved members can upload inventory location images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inventory-location-images'
  and public.is_workspace_member()
);

drop policy if exists "Approved members can update inventory location images" on storage.objects;
create policy "Approved members can update inventory location images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inventory-location-images'
  and public.is_workspace_member()
)
with check (
  bucket_id = 'inventory-location-images'
  and public.is_workspace_member()
);

drop policy if exists "Approved members can delete inventory location images" on storage.objects;
create policy "Approved members can delete inventory location images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inventory-location-images'
  and public.is_workspace_member()
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory_items'
  ) then
    alter publication supabase_realtime add table public.inventory_items;
  end if;
end;
$$;

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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'protocols'
  ) then
    alter publication supabase_realtime add table public.protocols;
  end if;
end;
$$;
