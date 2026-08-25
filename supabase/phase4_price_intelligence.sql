alter table products
  add column if not exists purchase_price numeric,
  add column if not exists months_used integer,
  add column if not exists ai_reference_price numeric,
  add column if not exists ai_fair_price_min numeric,
  add column if not exists ai_fair_price_max numeric,
  add column if not exists ai_price_verdict text,
  add column if not exists ai_price_confidence integer,
  add column if not exists ai_price_reason text,
  add column if not exists ai_price_sources jsonb,
  add column if not exists ai_price_checked_at timestamptz;
