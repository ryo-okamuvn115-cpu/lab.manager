alter table public.storage_locations
  add column if not exists detail_options jsonb not null default '[]'::jsonb;

update public.storage_locations
set detail_options = '[]'::jsonb
where detail_options is null;

comment on column public.storage_locations.detail_options is
  'Selectable inner-position labels for a storage location, for example shelves and left/right positions.';
