alter table public.inventory_items
  add column if not exists location_field_values jsonb not null default '[]'::jsonb;

alter table public.storage_locations
  add column if not exists detail_fields jsonb not null default '[]'::jsonb;

insert into public.storage_locations (name, details, detail_fields, sort_order, is_active)
values
  ('-30℃冷凍庫(白色)', '', '[]'::jsonb, 10, true),
  ('-30℃冷凍庫（番号34）', '', '[]'::jsonb, 20, true),
  ('-30℃冷凍庫（番号35）', '', '[]'::jsonb, 30, true),
  ('-30℃冷凍庫（番号36）', '', '[]'::jsonb, 40, true),
  ('-30℃冷凍庫（番号37）', '', '[]'::jsonb, 50, true),
  ('-80℃冷凍庫44', '', '[]'::jsonb, 60, true),
  ('-80℃冷凍庫45', '', '[]'::jsonb, 70, true),
  ('-80℃冷凍庫46', '', '[]'::jsonb, 80, true),
  ('4℃冷蔵庫（番号16）', '', '[]'::jsonb, 90, true),
  ('4℃冷蔵庫（番号17）', '', '[]'::jsonb, 100, true),
  ('4℃冷蔵庫（番号31）', '', '[]'::jsonb, 110, true),
  ('4℃冷蔵庫（番号32）', '', '[]'::jsonb, 120, true),
  ('4℃冷蔵庫（番号33）', '', '[]'::jsonb, 130, true),
  ('4℃冷蔵庫（番号4、培養室）', '', '[]'::jsonb, 140, true),
  ('4℃冷蔵庫（番号5、培養室）', '', '[]'::jsonb, 150, true),
  ('外劇物保管棚（ブルー）', '', '[]'::jsonb, 160, true),
  ('共通試薬棚（培養室前）', '', '[]'::jsonb, 170, true),
  ('液体窒素A', '', '[]'::jsonb, 180, true),
  ('液体窒素B', '', '[]'::jsonb, 190, true),
  ('液体窒素C', '', '[]'::jsonb, 200, true),
  ('液体窒素D', '', '[]'::jsonb, 210, true),
  ('液体窒素E', '', '[]'::jsonb, 220, true),
  ('鍵付きボックス（ビール瓶の鍵）', '', '[]'::jsonb, 230, true)
on conflict do nothing;

update public.storage_locations
set
  detail_fields = '[{"id":"tier","label":"段","options":["1段","2段","3段","4段","5段","6段","7段","8段"]}]'::jsonb,
  sort_order = 10,
  is_active = true
where lower(name) = lower('-30℃冷凍庫(白色)');

update public.storage_locations
set
  detail_fields = '[{"id":"tier","label":"段","options":["1段","2段","3段","4段","5段","6段"]},{"id":"side","label":"左右","options":["左","右"]}]'::jsonb,
  is_active = true
where lower(name) in (
  lower('-30℃冷凍庫（番号34）'),
  lower('-30℃冷凍庫（番号35）'),
  lower('-30℃冷凍庫（番号36）'),
  lower('-30℃冷凍庫（番号37）')
);

update public.storage_locations
set
  detail_fields = '[{"id":"tier","label":"段","options":["1段","2段","3段","4段","5段","6段"]}]'::jsonb,
  is_active = true
where lower(name) in (
  lower('-80℃冷凍庫44'),
  lower('-80℃冷凍庫45'),
  lower('-80℃冷凍庫46')
);

update public.storage_locations
set
  detail_fields = '[{"id":"tier","label":"段","options":["1段","2段","3段"]}]'::jsonb,
  is_active = true
where lower(name) = lower('4℃冷蔵庫（番号16）');

update public.storage_locations
set
  detail_fields = '[{"id":"tier","label":"段","options":["1段","2段","3段","4段","5段","6段"]},{"id":"side","label":"左右","options":["左","右"]}]'::jsonb,
  is_active = true
where lower(name) in (
  lower('4℃冷蔵庫（番号17）'),
  lower('4℃冷蔵庫（番号31）'),
  lower('4℃冷蔵庫（番号32）'),
  lower('4℃冷蔵庫（番号33）'),
  lower('4℃冷蔵庫（番号4、培養室）'),
  lower('4℃冷蔵庫（番号5、培養室）')
);

update public.storage_locations
set
  detail_fields = '[{"id":"vertical","label":"上下","options":["上","下"]},{"id":"column","label":"列","options":["1列","2列","3列","4列","5列","6列"]}]'::jsonb,
  is_active = true
where lower(name) = lower('外劇物保管棚（ブルー）');

update public.storage_locations
set
  detail_fields = '[]'::jsonb,
  is_active = true
where lower(name) in (
  lower('共通試薬棚（培養室前）'),
  lower('液体窒素A'),
  lower('液体窒素B'),
  lower('液体窒素C'),
  lower('液体窒素D'),
  lower('液体窒素E'),
  lower('鍵付きボックス（ビール瓶の鍵）')
);
