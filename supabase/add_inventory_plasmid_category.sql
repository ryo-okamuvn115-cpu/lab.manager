alter table public.inventory_items
  drop constraint if exists inventory_items_category_check;

alter table public.inventory_items
  add constraint inventory_items_category_check
  check (category in ('protein', 'antibody', 'reagent', 'plasmid', 'other'));
