-- EcoMatch Phase 6 Complete Safe Exchange Protocol
-- Run this ONCE in the same Supabase project used by .env.local

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Deal workflow fields
-- ---------------------------------------------------------
alter table public.deal_requests
  add column if not exists meeting_latitude double precision,
  add column if not exists meeting_longitude double precision,
  add column if not exists meeting_proposed_by uuid,
  add column if not exists buyer_meeting_confirmed boolean not null default false,
  add column if not exists seller_meeting_confirmed boolean not null default false,
  add column if not exists buyer_checked_in_at timestamptz,
  add column if not exists seller_checked_in_at timestamptz,
  add column if not exists buyer_checkin_latitude double precision,
  add column if not exists buyer_checkin_longitude double precision,
  add column if not exists seller_checkin_latitude double precision,
  add column if not exists seller_checkin_longitude double precision,
  add column if not exists buyer_trusted_contact_name text,
  add column if not exists buyer_trusted_contact_phone text,
  add column if not exists seller_trusted_contact_name text,
  add column if not exists seller_trusted_contact_phone text,
  add column if not exists exchange_code_hash text,
  add column if not exists exchange_code_generated_at timestamptz,
  add column if not exists exchange_code_verified_at timestamptz,
  add column if not exists buyer_handover_confirmed_at timestamptz,
  add column if not exists seller_handover_confirmed_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Expand the status constraint safely.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.deal_requests'::regclass
      and conname = 'deal_requests_status_check'
  ) then
    alter table public.deal_requests drop constraint deal_requests_status_check;
  end if;
end $$;

alter table public.deal_requests
  add constraint deal_requests_status_check
  check (status in (
    'requested',
    'accepted',
    'rejected',
    'cancelled',
    'meeting_planned',
    'exchange_ready',
    'completed'
  ));

-- ---------------------------------------------------------
-- Product ownership state
-- ---------------------------------------------------------
alter table public.products
  add column if not exists current_owner_id uuid references auth.users(id) on delete set null,
  add column if not exists sold_deal_id uuid references public.deal_requests(id) on delete set null;

-- Existing products start with the original seller as current owner.
update public.products
set current_owner_id = seller_id
where current_owner_id is null;

-- ---------------------------------------------------------
-- Persistent ownership transfer ledger
-- ---------------------------------------------------------
create table if not exists public.ownership_events (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(id) on delete cascade,
  deal_id uuid references public.deal_requests(id) on delete set null,
  deal_code text,
  previous_owner_id uuid references auth.users(id) on delete set null,
  new_owner_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'ownership_transfer',
  previous_hash text not null,
  event_hash text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists ownership_events_product_idx on public.ownership_events(product_id);
create index if not exists ownership_events_created_idx on public.ownership_events(created_at);

alter table public.ownership_events enable row level security;

drop policy if exists "authenticated can view ownership events" on public.ownership_events;
create policy "authenticated can view ownership events"
on public.ownership_events for select
to authenticated
using (true);

-- ---------------------------------------------------------
-- Secure OTP: seller sets a one-time code, only a hash is stored.
-- ---------------------------------------------------------
create or replace function public.set_deal_exchange_code(
  p_deal_id uuid,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deal_requests%rowtype;
begin
  select * into d
  from public.deal_requests
  where id = p_deal_id;

  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> d.seller_id then
    raise exception 'Only the seller can generate the exchange code';
  end if;

  if d.status <> 'exchange_ready' then
    raise exception 'Both participants must check in before generating the exchange code';
  end if;

  if p_code !~ '^[0-9]{6}$' then
    raise exception 'Exchange code must be exactly six digits';
  end if;

  update public.deal_requests
  set exchange_code_hash = encode(digest(p_code, 'sha256'), 'hex'),
      exchange_code_generated_at = now(),
      exchange_code_verified_at = null,
      buyer_handover_confirmed_at = null,
      seller_handover_confirmed_at = null,
      updated_at = now()
  where id = p_deal_id;

  return true;
end;
$$;

-- Buyer verifies the OTP without ever reading the stored hash.
create or replace function public.verify_deal_exchange_code(
  p_deal_id uuid,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deal_requests%rowtype;
begin
  select * into d
  from public.deal_requests
  where id = p_deal_id;

  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> d.buyer_id then
    raise exception 'Only the buyer can verify the exchange code';
  end if;

  if d.status <> 'exchange_ready' then
    raise exception 'Deal is not ready for handover';
  end if;

  if d.exchange_code_hash is null then
    raise exception 'Seller has not generated an exchange code yet';
  end if;

  if encode(digest(p_code, 'sha256'), 'hex') <> d.exchange_code_hash then
    return false;
  end if;

  update public.deal_requests
  set exchange_code_verified_at = now(),
      updated_at = now()
  where id = p_deal_id;

  return true;
end;
$$;

-- ---------------------------------------------------------
-- Two-sided handover confirmation + automatic ownership transfer.
-- ---------------------------------------------------------
create or replace function public.confirm_deal_handover(
  p_deal_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deal_requests%rowtype;
  previous_hash_value text;
  new_hash_value text;
begin
  select * into d
  from public.deal_requests
  where id = p_deal_id
  for update;

  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> d.buyer_id and auth.uid() <> d.seller_id then
    raise exception 'Only deal participants can confirm handover';
  end if;

  if d.status <> 'exchange_ready' then
    raise exception 'Deal is not ready for handover';
  end if;

  if d.exchange_code_verified_at is null then
    raise exception 'Buyer must verify the secure exchange code first';
  end if;

  if auth.uid() = d.buyer_id then
    update public.deal_requests
    set buyer_handover_confirmed_at = coalesce(buyer_handover_confirmed_at, now()),
        updated_at = now()
    where id = p_deal_id;
  else
    update public.deal_requests
    set seller_handover_confirmed_at = coalesce(seller_handover_confirmed_at, now()),
        updated_at = now()
    where id = p_deal_id;
  end if;

  select * into d
  from public.deal_requests
  where id = p_deal_id;

  if d.buyer_handover_confirmed_at is not null
     and d.seller_handover_confirmed_at is not null then

    select event_hash into previous_hash_value
    from public.ownership_events
    order by created_at desc, id desc
    limit 1;

    previous_hash_value := coalesce(previous_hash_value, 'GENESIS');

    new_hash_value := encode(
      digest(
        concat_ws('|',
          d.id::text,
          d.deal_code,
          d.product_id::text,
          d.seller_id::text,
          d.buyer_id::text,
          now()::text,
          previous_hash_value
        ),
        'sha256'
      ),
      'hex'
    );

    if not exists (
      select 1 from public.ownership_events where deal_id = d.id
    ) then
      insert into public.ownership_events (
        product_id,
        deal_id,
        deal_code,
        previous_owner_id,
        new_owner_id,
        event_type,
        previous_hash,
        event_hash
      ) values (
        d.product_id,
        d.id,
        d.deal_code,
        d.seller_id,
        d.buyer_id,
        'ownership_transfer',
        previous_hash_value,
        new_hash_value
      );
    end if;

    update public.deal_requests
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = p_deal_id;

    update public.products
    set status = 'sold',
        current_owner_id = d.buyer_id,
        sold_deal_id = d.id
    where id = d.product_id;

    return 'completed';
  end if;

  return 'waiting_for_other_party';
end;
$$;

grant execute on function public.set_deal_exchange_code(uuid, text) to authenticated;
grant execute on function public.verify_deal_exchange_code(uuid, text) to authenticated;
grant execute on function public.confirm_deal_handover(uuid) to authenticated;

notify pgrst, 'reload schema';
