-- Canonical Vision assessment and seller-confirmed shipment weight.
begin;
alter table public.products
  add column if not exists ai_visual_condition text,
  add column if not exists ai_condition_confidence numeric(4,3),
  add column if not exists ai_condition_reason text,
  add column if not exists ai_weight_confidence numeric(4,3),
  add column if not exists ai_weight_basis text,
  add column if not exists seller_confirmed_weight_kg numeric(10,3),
  add column if not exists seller_weight_confirmed_at timestamptz;
alter table public.products drop constraint if exists products_seller_confirmed_weight_kg_check;
alter table public.products add constraint products_seller_confirmed_weight_kg_check check (seller_confirmed_weight_kg is null or (seller_confirmed_weight_kg > 0 and seller_confirmed_weight_kg <= 100000));
commit;
