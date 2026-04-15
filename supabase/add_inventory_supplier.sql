alter table public.inventory_items
  add column if not exists supplier text not null default 'other';

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
