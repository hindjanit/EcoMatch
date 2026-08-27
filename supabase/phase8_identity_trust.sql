-- EcoMatch Phase 8 — Identity + Trust System
-- Run after the earlier Phase 7 migrations / patches.

alter table public.profiles
  add column if not exists verification_status text default 'unverified',
  add column if not exists verification_method text,
  add column if not exists verified_at timestamptz,
  add column if not exists identity_reference_hash text,
  add column if not exists identity_name text,
  add column if not exists identity_liveness_passed boolean not null default false,
  add column if not exists identity_face_match_score numeric,
  add column if not exists trust_score integer not null default 0,
  add column if not exists successful_deals integer not null default 0;

create table if not exists public.identity_verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null default 'aadhaar_offline_ekyc',
  uidai_signature_valid boolean not null default false,
  liveness_passed boolean not null default false,
  face_match_score numeric,
  reference_hash text,
  status text not null default 'started' check (status in ('started','document_verified','verified','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.identity_verification_events enable row level security;
drop policy if exists "users view own verification events" on public.identity_verification_events;
create policy "users view own verification events" on public.identity_verification_events
for select to authenticated using (auth.uid() = user_id);

create or replace function public.complete_identity_verification(
  p_reference_hash text,
  p_identity_name text,
  p_liveness_passed boolean,
  p_face_match_score numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_score integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_reference_hash),'') = '' then raise exception 'Verified UIDAI proof is required'; end if;
  if p_liveness_passed is not true then raise exception 'Live selfie presence check is required'; end if;

  -- Phase 8 browser-local face comparison is recorded when available.
  -- The signed UIDAI proof + randomized live camera challenge are mandatory.
  v_score := 70;
  if p_face_match_score is not null and p_face_match_score >= 0.70 then v_score := 85; end if;

  update public.profiles set
    verification_status = 'verified',
    verification_method = 'aadhaar_offline_ekyc_plus_live_selfie',
    verified_at = now(),
    identity_reference_hash = p_reference_hash,
    identity_name = nullif(trim(p_identity_name),''),
    identity_liveness_passed = true,
    identity_face_match_score = p_face_match_score,
    trust_score = greatest(coalesce(trust_score,0), v_score)
  where id = v_user;

  insert into public.identity_verification_events(user_id, uidai_signature_valid, liveness_passed, face_match_score, reference_hash, status, completed_at)
  values(v_user, true, true, p_face_match_score, p_reference_hash, 'verified', now());

  return jsonb_build_object('verified',true,'trust_score',v_score);
end;
$$;
grant execute on function public.complete_identity_verification(text,text,boolean,numeric) to authenticated;

-- Trust score refresh after successful deals.
create or replace function public.refresh_ecomatch_trust_score(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_verified boolean; v_deals integer; v_score integer;
begin
  select verification_status='verified' into v_verified from profiles where id=p_user_id;
  select count(*) into v_deals from deal_requests where status='completed' and (buyer_id=p_user_id or seller_id=p_user_id);
  v_score := least(100, (case when coalesce(v_verified,false) then 70 else 10 end) + least(25,v_deals*5));
  update profiles set trust_score=v_score, successful_deals=v_deals where id=p_user_id;
  return v_score;
end $$;
grant execute on function public.refresh_ecomatch_trust_score(uuid) to authenticated;

-- Reassert seller gates server-side.
create or replace function public.enforce_listing_trust_rules()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_status text; v_active_count integer;
begin
  select coalesce(verification_status,'unverified') into v_status from profiles where id=new.seller_id;
  v_status := coalesce(v_status,'unverified');
  if v_status <> 'verified' then
    if coalesce(new.price,0) > 1000 then raise exception 'IDENTITY_VERIFICATION_REQUIRED: Listings above Rs 1000 require EcoMatch Aadhaar Identity Verification.'; end if;
    select count(*) into v_active_count from products where seller_id=new.seller_id and status in ('pending','approved');
    if v_active_count >= 30 then raise exception 'UNVERIFIED_ACTIVE_LIMIT: Unverified accounts can have at most 30 active listings.'; end if;
  else
    select count(*) into v_active_count from products where seller_id=new.seller_id and status in ('pending','approved');
    if v_active_count >= 300 then raise exception 'VERIFIED_ACTIVE_LIMIT: Verified accounts can have at most 300 active listings.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_enforce_listing_trust_rules on public.products;
create trigger trg_enforce_listing_trust_rules before insert on public.products for each row execute function public.enforce_listing_trust_rules();

notify pgrst, 'reload schema';

-- =========================================================
-- Phase 7B patches consolidated into Phase 8
-- Prevents the previously observed exchange_ready / pgcrypto schema issues.
-- =========================================================
do $$ begin
  if exists (select 1 from pg_constraint where conrelid='public.deal_requests'::regclass and conname='deal_requests_status_check') then
    alter table public.deal_requests drop constraint deal_requests_status_check;
  end if;
end $$;
alter table public.deal_requests add constraint deal_requests_status_check
check (status in ('requested','accepted','rejected','cancelled','meeting_planned','exchange_ready','completed'));

create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_deal_exchange_code(p_deal_id uuid)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare d public.deal_requests%rowtype; v_bytes bytea; v_number integer; v_code text;
begin
  select * into d from public.deal_requests where id=p_deal_id for update;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> d.seller_id then raise exception 'Only the seller can generate the exchange code'; end if;
  if d.status <> 'exchange_ready' then raise exception 'Both participants must confirm the meeting first'; end if;
  if d.exchange_code_verified_at is not null then raise exception 'Exchange code is already verified'; end if;
  v_bytes := extensions.gen_random_bytes(4);
  v_number := (((get_byte(v_bytes,0)::bigint*16777216)+(get_byte(v_bytes,1)::bigint*65536)+(get_byte(v_bytes,2)::bigint*256)+get_byte(v_bytes,3)::bigint)%900000)::integer+100000;
  v_code := lpad(v_number::text,6,'0');
  update public.deal_requests set exchange_code_hash=encode(extensions.digest(v_code,'sha256'),'hex'), exchange_code_generated_at=now(), exchange_code_expires_at=now()+interval '10 minutes', exchange_code_attempts=0, exchange_code_verified_at=null, buyer_handover_confirmed_at=null, seller_handover_confirmed_at=null, updated_at=now() where id=p_deal_id;
  return v_code;
end $$;
grant execute on function public.generate_deal_exchange_code(uuid) to authenticated;

create or replace function public.verify_deal_exchange_code(p_deal_id uuid,p_code text)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare d public.deal_requests%rowtype; v_match boolean;
begin
  select * into d from public.deal_requests where id=p_deal_id for update;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> d.buyer_id then raise exception 'Only the buyer can verify the exchange code'; end if;
  if d.status <> 'exchange_ready' then raise exception 'Deal is not ready for handover'; end if;
  if d.exchange_code_hash is null then raise exception 'Seller has not generated an exchange code yet'; end if;
  if d.exchange_code_expires_at is not null and now()>d.exchange_code_expires_at then raise exception 'Exchange OTP has expired. Ask seller to generate a new OTP'; end if;
  if coalesce(d.exchange_code_attempts,0)>=8 then raise exception 'Too many incorrect OTP attempts. Ask seller to generate a new OTP'; end if;
  v_match := encode(extensions.digest(trim(p_code),'sha256'),'hex')=d.exchange_code_hash;
  if not v_match then update public.deal_requests set exchange_code_attempts=coalesce(exchange_code_attempts,0)+1,updated_at=now() where id=p_deal_id; return false; end if;
  update public.deal_requests set exchange_code_verified_at=now(),updated_at=now() where id=p_deal_id;
  return true;
end $$;
grant execute on function public.verify_deal_exchange_code(uuid,text) to authenticated;
notify pgrst, 'reload schema';
