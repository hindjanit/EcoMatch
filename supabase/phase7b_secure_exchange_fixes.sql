-- EcoMatch Phase 7B: Negotiation / Admin display / Secure Exchange bug fixes
-- Run this once in the SAME Supabase project used by .env.local.
-- Safe to run repeatedly.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) SECURE EXCHANGE OTP EXPIRY + ATTEMPTS
-- =========================================================
alter table public.deal_requests
  add column if not exists exchange_code_expires_at timestamptz,
  add column if not exists exchange_code_attempts integer not null default 0;

-- =========================================================
-- 2) ATOMIC MEETING CONFIRMATION
-- Fixes the state where Buyer Confirmed + Seller Confirmed was visible
-- but the deal stayed ACCEPTED and OTP never unlocked.
-- =========================================================
create or replace function public.confirm_deal_meeting(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deal_requests%rowtype;
begin
  select * into d
  from public.deal_requests
  where id = p_deal_id
  for update;

  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> d.buyer_id and auth.uid() <> d.seller_id then
    raise exception 'Only deal participants can confirm the meeting';
  end if;

  if d.status not in ('accepted', 'meeting_planned', 'exchange_ready') then
    raise exception 'This deal is not waiting for meeting confirmation';
  end if;

  if d.meeting_location is null or d.meeting_at is null then
    raise exception 'Meeting location and time must be saved first';
  end if;

  if auth.uid() = d.buyer_id then
    update public.deal_requests
    set buyer_meeting_confirmed = true,
        updated_at = now()
    where id = p_deal_id;
  else
    update public.deal_requests
    set seller_meeting_confirmed = true,
        updated_at = now()
    where id = p_deal_id;
  end if;

  select * into d
  from public.deal_requests
  where id = p_deal_id;

  if d.buyer_meeting_confirmed and d.seller_meeting_confirmed then
    update public.deal_requests
    set status = 'exchange_ready',
        updated_at = now()
    where id = p_deal_id;

    return 'exchange_ready';
  end if;

  return 'waiting_for_other_party';
end;
$$;

grant execute on function public.confirm_deal_meeting(uuid) to authenticated;

-- Repair already-created deals that reached the exact broken state.
update public.deal_requests
set status = 'exchange_ready',
    updated_at = now()
where status in ('accepted', 'meeting_planned')
  and buyer_meeting_confirmed = true
  and seller_meeting_confirmed = true
  and meeting_location is not null
  and meeting_at is not null;

-- =========================================================
-- 3) SERVER-GENERATED 6-DIGIT OTP
-- Only the seller receives plaintext. DB stores only SHA-256 hash.
-- OTP expires after 10 minutes and can be regenerated.
-- =========================================================
create or replace function public.generate_deal_exchange_code(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deal_requests%rowtype;
  v_bytes bytea;
  v_number integer;
  v_code text;
begin
  select * into d
  from public.deal_requests
  where id = p_deal_id
  for update;

  if not found then
    raise exception 'Deal not found';
  end if;

  if auth.uid() <> d.seller_id then
    raise exception 'Only the seller can generate the exchange code';
  end if;

  if d.status <> 'exchange_ready' then
    raise exception 'Both participants must confirm the meeting first';
  end if;

  if d.exchange_code_verified_at is not null then
    raise exception 'Exchange code is already verified';
  end if;

  v_bytes := gen_random_bytes(3);
  v_number := (
    get_byte(v_bytes, 0) * 65536
    + get_byte(v_bytes, 1) * 256
    + get_byte(v_bytes, 2)
  ) % 900000 + 100000;
  v_code := v_number::text;

  update public.deal_requests
  set exchange_code_hash = encode(digest(v_code, 'sha256'), 'hex'),
      exchange_code_generated_at = now(),
      exchange_code_expires_at = now() + interval '10 minutes',
      exchange_code_attempts = 0,
      exchange_code_verified_at = null,
      buyer_handover_confirmed_at = null,
      seller_handover_confirmed_at = null,
      updated_at = now()
  where id = p_deal_id;

  return v_code;
end;
$$;

grant execute on function public.generate_deal_exchange_code(uuid) to authenticated;

-- Replace the old verifier with expiry + attempt handling.
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
  v_match boolean;
begin
  select * into d
  from public.deal_requests
  where id = p_deal_id
  for update;

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

  if d.exchange_code_expires_at is not null and now() > d.exchange_code_expires_at then
    return false;
  end if;

  if coalesce(d.exchange_code_attempts, 0) >= 8 then
    raise exception 'Too many incorrect OTP attempts. Ask the seller to generate a new code';
  end if;

  v_match := encode(digest(trim(p_code), 'sha256'), 'hex') = d.exchange_code_hash;

  if not v_match then
    update public.deal_requests
    set exchange_code_attempts = coalesce(exchange_code_attempts, 0) + 1,
        updated_at = now()
    where id = p_deal_id;
    return false;
  end if;

  update public.deal_requests
  set exchange_code_verified_at = now(),
      updated_at = now()
  where id = p_deal_id;

  return true;
end;
$$;

grant execute on function public.verify_deal_exchange_code(uuid, text) to authenticated;

notify pgrst, 'reload schema';
