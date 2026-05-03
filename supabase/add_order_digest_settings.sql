alter table public.workspace_members
  add column if not exists receives_order_digest boolean not null default false;
