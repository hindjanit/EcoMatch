-- EcoMatch Phase 5A: Safe Exchange foundation
create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verification_method text,
  add column if not exists verified_at timestamptz;

create table if not exists public.deal_requests (
  id uuid primary key default gen_random_uuid(),
  deal_code text not null unique,
  product_id bigint not null references public.products(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','accepted','rejected','cancelled','meeting_planned','completed')),
  meeting_location text,
  meeting_at timestamptz,
  buyer_confirmed boolean not null default false,
  seller_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_not_seller check (buyer_id <> seller_id)
);

create index if not exists deal_requests_buyer_idx on public.deal_requests(buyer_id);
create index if not exists deal_requests_seller_idx on public.deal_requests(seller_id);
create index if not exists deal_requests_product_idx on public.deal_requests(product_id);

alter table public.deal_requests enable row level security;

drop policy if exists "deal participants can view" on public.deal_requests;
create policy "deal participants can view"
on public.deal_requests for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyers can create deal requests" on public.deal_requests;
create policy "buyers can create deal requests"
on public.deal_requests for insert
to authenticated
with check (auth.uid() = buyer_id and buyer_id <> seller_id);

drop policy if exists "participants can update deals" on public.deal_requests;
create policy "participants can update deals"
on public.deal_requests for update
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

notify pgrst, 'reload schema';
