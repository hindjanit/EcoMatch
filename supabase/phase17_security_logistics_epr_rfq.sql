-- ====================================================================
-- ECOMATCH PHASE 17: CALL SAFETY & TRANSCRIPTION, LOGISTICS FREIGHT,
-- EPR GREEN CERTIFICATES, AND BUYER RFQ REQUISITIONS
-- ====================================================================

-- 1. EXTEND CALL LOGS FOR RECORDINGS & AI TRANSCRIPT DIVERSION
alter table public.deal_call_logs
  add column if not exists transcript text,
  add column if not exists is_diverted boolean default false,
  add column if not exists diverted_party text,
  add column if not exists diversion_reason text,
  add column if not exists diversion_snippet text,
  add column if not exists risk_score integer default 0,
  add column if not exists risk_level text default 'LOW',
  add column if not exists admin_action text default 'NONE',
  add column if not exists admin_notes text;

alter table public.calls
  add column if not exists recording_url text,
  add column if not exists transcript text,
  add column if not exists is_diverted boolean default false,
  add column if not exists diverted_party text,
  add column if not exists diversion_reason text,
  add column if not exists diversion_snippet text,
  add column if not exists risk_score integer default 0,
  add column if not exists risk_level text default 'LOW',
  add column if not exists admin_action text default 'NONE',
  add column if not exists admin_notes text;

-- 2. EXTEND DEAL_REQUESTS FOR LOGISTICS & FREIGHT TRACKING (POINT 4)
alter table public.deal_requests
  add column if not exists delivery_type text default 'ex_factory'
    check (delivery_type in ('ex_factory', 'seller_delivery', 'logistics_partner')),
  add column if not exists freight_cost numeric default 0,
  add column if not exists vehicle_number text,
  add column if not exists eway_bill_number text,
  add column if not exists transporter_name text,
  add column if not exists dispatch_notes text;

-- 3. EPR GREEN COMPLIANCE & CARBON OFFSET CERTIFICATES TABLE (POINT 5)
create table if not exists public.epr_certificates (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deal_requests(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  certificate_no text not null unique,
  material_category text not null,
  quantity_kg numeric not null default 0,
  carbon_saved_kg numeric not null default 0,
  waste_diverted_kg numeric not null default 0,
  water_saved_liters numeric default 0,
  epr_category text default 'Category I: Rigid Plastic',
  compliance_standard text default 'PWM Rules 2016 / CPCB Circular Guidelines',
  verification_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.epr_certificates enable row level security;

drop policy if exists "deal participants can view epr certificate" on public.epr_certificates;
create policy "deal participants can view epr certificate" on public.epr_certificates
  for select to authenticated
  using (
    auth.uid() = buyer_id or
    auth.uid() = seller_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "authenticated can generate epr certificate" on public.epr_certificates;
create policy "authenticated can generate epr certificate" on public.epr_certificates
  for insert to authenticated
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 4. BUYER RFQ (REQUEST FOR QUOTATION) REQUISITION BOARD (POINT 6)
create table if not exists public.buyer_rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  material_type text not null,
  target_quantity numeric not null,
  quantity_unit text not null default 'MT',
  target_price_per_unit numeric,
  urgency text not null default 'MEDIUM' check (urgency in ('LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE')),
  location_city text not null,
  location_state text not null,
  cluster_radius_km integer default 50,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_NEGOTIATION', 'FULFILLED', 'CLOSED')),
  created_at timestamptz not null default now()
);

alter table public.buyer_rfqs enable row level security;

drop policy if exists "public can view active rfqs" on public.buyer_rfqs;
create policy "public can view active rfqs" on public.buyer_rfqs
  for select to authenticated, anon
  using (true);

drop policy if exists "buyers can insert own rfqs" on public.buyer_rfqs;
create policy "buyers can insert own rfqs" on public.buyer_rfqs
  for insert to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "buyers can update own rfqs" on public.buyer_rfqs;
create policy "buyers can update own rfqs" on public.buyer_rfqs
  for update to authenticated
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

-- Storage bucket for call recordings
insert into storage.buckets (id, name, public)
values ('deal_recordings', 'deal_recordings', true)
on conflict (id) do nothing;
