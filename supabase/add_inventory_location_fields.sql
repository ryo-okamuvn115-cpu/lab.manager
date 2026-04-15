alter table public.inventory_items
  add column if not exists location_preset text not null default '';

alter table public.inventory_items
  add column if not exists location_detail text not null default '';

alter table public.inventory_items
  add column if not exists location_image_path text not null default '';

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
