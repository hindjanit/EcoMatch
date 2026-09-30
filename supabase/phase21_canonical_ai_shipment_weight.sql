-- EcoMatch Phase 21: canonical AI shipment weight.
-- Safe to run after Phase 20; this is additive and idempotent.
begin;

alter table public.products
  add column if not exists ai_estimated_weight_kg numeric(10,3),
  add column if not exists ai_weight_bulky boolean,
  add column if not exists ai_weight_assessed_at timestamptz;

alter table public.products
  drop constraint if exists products_ai_estimated_weight_kg_check;
alter table public.products
  add constraint products_ai_estimated_weight_kg_check
  check (ai_estimated_weight_kg is null or (ai_estimated_weight_kg > 0 and ai_estimated_weight_kg <= 100000));

create index if not exists idx_products_ai_shipment_weight
  on public.products (ai_weight_assessed_at)
  where ai_estimated_weight_kg is not null;

commit;
