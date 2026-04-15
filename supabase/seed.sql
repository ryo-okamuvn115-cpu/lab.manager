insert into public.inventory_items (
  id, name, category, quantity, unit, min_quantity, expiry_date, supplier, location, location_preset, location_detail, location_image_path, notes, created_at, updated_at
)
values
  ('inv_mnof902e_hw43h9sf', 'myc-SRSF1', 'protein', 1, 'bottle', 1, '2026-04-07', 'other', '-30℃冷凍庫（番号34）', '-30℃冷凍庫（番号34）', '', '', '', '2026-04-07T09:33:26.294Z', '2026-04-07T09:33:26.294Z'),
  ('inv-1', 'Bovine Serum Albumin (BSA)', 'protein', 50, 'mg', 10, '2026-12-03', 'ikeda-rika', '4℃冷蔵庫（番号16）', '4℃冷蔵庫（番号16）', '', '', 'For protein quantification', '2026-04-07T09:20:33.075Z', '2026-04-07T09:20:33.075Z'),
  ('inv-2', 'Mouse Anti-Human Beta Actin Antibody', 'antibody', 5, 'mL', 2, '2026-08-05', 'yaken', '-80℃冷凍庫45', '-80℃冷凍庫45', '', '', 'For Western blot', '2026-04-07T09:20:33.075Z', '2026-04-07T09:20:33.075Z'),
  ('inv-3', 'Rabbit Anti-Mouse IgG (HRP)', 'antibody', 3, 'mL', 1, '2026-10-04', 'tone-kagaku', '-30℃冷凍庫（番号37） / 上段', '-30℃冷凍庫（番号37）', '上段', '', 'Secondary antibody', '2026-04-07T09:20:33.075Z', '2026-04-07T09:20:33.075Z'),
  ('inv-4', 'DMEM Medium', 'reagent', 2, 'L', 1, '2026-05-22', 'ut', '4℃冷蔵庫（番号5、培養室）', '4℃冷蔵庫（番号5、培養室）', '', '', 'For cell culture', '2026-04-07T09:20:33.075Z', '2026-04-07T09:20:33.075Z'),
  ('inv-5', 'PBS (10x)', 'reagent', 1, 'bottle', 1, '2026-06-06', 'other', '共通試薬棚（培養室前）', '共通試薬棚（培養室前）', '', '', 'Wash buffer', '2026-04-07T09:20:33.075Z', '2026-04-07T09:20:33.075Z')
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  quantity = excluded.quantity,
  unit = excluded.unit,
  min_quantity = excluded.min_quantity,
  expiry_date = excluded.expiry_date,
  supplier = excluded.supplier,
  location = excluded.location,
  location_preset = excluded.location_preset,
  location_detail = excluded.location_detail,
  location_image_path = excluded.location_image_path,
  notes = excluded.notes,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

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

insert into public.orders (
  id, order_number, items, total_amount, status, notes, created_at, updated_at
)
values
  (
    'ord-1',
    'ORD-2026-001',
    '[{"id":"ord-1-item-1","itemName":"PBS (10x)","quantity":1,"unitPrice":5000,"totalPrice":5000},{"id":"ord-1-item-2","itemName":"Tris-HCl pH 8.0","quantity":2,"unitPrice":3000,"totalPrice":6000}]'::jsonb,
    11000,
    'approved',
    'Buffer reagents',
    '2026-03-31T09:20:33.077Z',
    '2026-03-31T09:20:33.077Z'
  ),
  (
    'ord-2',
    'ORD-2026-002',
    '[{"id":"ord-2-item-1","itemName":"Mouse Anti-Human Beta Actin Antibody","quantity":1,"unitPrice":25000,"totalPrice":25000}]'::jsonb,
    25000,
    'submitted',
    'For immunostaining',
    '2026-04-04T09:20:33.077Z',
    '2026-04-04T09:20:33.077Z'
  )
on conflict (id) do update
set
  order_number = excluded.order_number,
  items = excluded.items,
  total_amount = excluded.total_amount,
  status = excluded.status,
  notes = excluded.notes,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.protocols (
  id, title, category, description, steps, estimated_time, difficulty, created_at, updated_at
)
values
  (
    'prot-1',
    'Western Blot',
    'Protein Analysis',
    'Separate and detect proteins with SDS-PAGE and transfer.',
    '[{"id":"step-1","stepNumber":1,"title":"Sample Preparation","description":"Dilute protein samples with loading buffer.","materials":["Sample","Loading buffer","Microtube"],"duration":"10 min"},{"id":"step-2","stepNumber":2,"title":"Electrophoresis","description":"Separate samples on an SDS-PAGE gel.","materials":["SDS-PAGE gel","Electrophoresis unit","Power supply"],"duration":"90 min"}]'::jsonb,
    '3-4 h',
    'medium',
    '2026-04-07T09:20:33.075Z',
    '2026-04-07T09:20:33.075Z'
  ),
  (
    'prot-2',
    'ELISA',
    'Protein Quantification',
    'Measure proteins with enzyme-linked immunosorbent assay.',
    '[{"id":"step-3","stepNumber":1,"title":"Plate Coating","description":"Coat antibodies onto a 96-well plate.","materials":["96-well plate","Capture antibody","Coating buffer"],"duration":"2 h"},{"id":"step-4","stepNumber":2,"title":"Blocking","description":"Block the plate before sample incubation.","materials":["Blocking buffer","Incubator"],"duration":"1 h"}]'::jsonb,
    '4-5 h',
    'easy',
    '2026-04-07T09:20:33.075Z',
    '2026-04-07T09:20:33.075Z'
  ),
  (
    'prot-3',
    'PCR',
    'DNA Amplification',
    'Amplify DNA targets by polymerase chain reaction.',
    '[{"id":"step-5","stepNumber":1,"title":"Mix Preparation","description":"Prepare template DNA, primers, and dNTP mixture.","materials":["Template DNA","Primers","dNTP","PCR buffer"],"duration":"15 min"},{"id":"step-6","stepNumber":2,"title":"Thermal Cycling","description":"Run amplification in the thermal cycler.","materials":["Thermal cycler","PCR tubes"],"duration":"120 min"}]'::jsonb,
    '2-3 h',
    'easy',
    '2026-04-07T09:20:33.075Z',
    '2026-04-07T09:20:33.075Z'
  )
on conflict (id) do update
set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  steps = excluded.steps,
  estimated_time = excluded.estimated_time,
  difficulty = excluded.difficulty,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
