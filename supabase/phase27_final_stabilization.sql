-- EcoMatch Phase 27 — Final trust, B2B and handover stabilization
-- Apply AFTER phase26_optional_business_trust.sql.
-- Safe, additive/replace-in-place patch for projects where Phase 26 was already applied.

begin;

-- ---------------------------------------------------------------------------
-- 1) Optional verification really is optional: retire Phase 11 Aadhaar price gates.
--    Keep one neutral anti-spam listing cap for every account.
-- ---------------------------------------------------------------------------
drop trigger if exists trg_enforce_deal_trust_rules on public.deal_requests;
drop trigger if exists trg_enforce_offer_trust_rules on public.product_offers;
drop trigger if exists trg_enforce_listing_trust_rules on public.products;

create or replace function public.enforce_listing_trust_rules()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_active_count integer;
begin
  select count(*) into v_active_count
  from public.products
  where seller_id = new.seller_id
    and status in ('pending','pending_review','changes_requested','approved','reserved');
  if v_active_count >= 300 then
    raise exception 'ACTIVE_LISTING_LIMIT: An account can have at most 300 active listings.';
  end if;
  return new;
end $$;

create trigger trg_enforce_listing_trust_rules
before insert on public.products
for each row execute function public.enforce_listing_trust_rules();

-- ---------------------------------------------------------------------------
-- 2) Deal-level optional verification requests.
--    Mandatory listing requirements stay immutable; optional requests can be
--    declined and then waived by the original requester.
-- ---------------------------------------------------------------------------
alter table public.deal_requests
  add column if not exists identity_verification_requested_for uuid references auth.users(id),
  add column if not exists identity_verification_request_status text not null default 'none',
  add column if not exists business_verification_requested_for uuid references auth.users(id),
  add column if not exists business_verification_request_status text not null default 'none';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='deal_identity_request_status_check') then
    alter table public.deal_requests add constraint deal_identity_request_status_check
      check(identity_verification_request_status in ('none','pending','declined','waived'));
  end if;
  if not exists (select 1 from pg_constraint where conname='deal_business_request_status_check') then
    alter table public.deal_requests add constraint deal_business_request_status_check
      check(business_verification_request_status in ('none','pending','declined','waived'));
  end if;
end $$;

create or replace function public.trust_deal_verification_request(p_deal uuid,p_action text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  d public.deal_requests%rowtype;
  u uuid:=auth.uid();
  target uuid;
  target_profile public.profiles%rowtype;
begin
  select * into d from public.deal_requests where id=p_deal for update;
  if d.id is null or u is null or u not in(d.buyer_id,d.seller_id) then raise exception 'Deal access denied'; end if;
  if d.status in('completed','cancelled','rejected','disputed') then raise exception 'Verification requests are closed for this deal'; end if;
  target:=case when u=d.buyer_id then d.seller_id else d.buyer_id end;
  select * into target_profile from public.profiles where id=target;
  perform set_config('ecomatch.trust_deal','authorized',true);

  if p_action='request_identity' then
    update public.deal_requests set verification_requested_by=u,verification_requested_at=now(),identity_verification_requested_for=target,
      identity_verification_request_status=case when target_profile.verification_status in('verified','verified_demo') then 'waived' else 'pending' end,updated_at=now() where id=d.id;
  elsif p_action='request_business' then
    update public.deal_requests set business_verification_requested_by=u,business_verification_requested_at=now(),business_verification_requested_for=target,
      business_verification_request_status=case when target_profile.business_verification_status='verified' then 'waived' else 'pending' end,updated_at=now() where id=d.id;
  elsif p_action='decline_identity' then
    if u<>d.identity_verification_requested_for or d.identity_verification_request_status<>'pending' then raise exception 'No identity request is awaiting your response'; end if;
    update public.deal_requests set identity_verification_request_status='declined',updated_at=now() where id=d.id;
  elsif p_action='decline_business' then
    if u<>d.business_verification_requested_for or d.business_verification_request_status<>'pending' then raise exception 'No business request is awaiting your response'; end if;
    update public.deal_requests set business_verification_request_status='declined',updated_at=now() where id=d.id;
  elsif p_action='waive_identity' then
    if u<>d.verification_requested_by or d.identity_verification_request_status not in('pending','declined') then raise exception 'Only the requester may continue without identity verification'; end if;
    update public.deal_requests set identity_verification_request_status='waived',updated_at=now() where id=d.id;
  elsif p_action='waive_business' then
    if u<>d.business_verification_requested_by or d.business_verification_request_status not in('pending','declined') then raise exception 'Only the requester may continue without business verification'; end if;
    update public.deal_requests set business_verification_request_status='waived',updated_at=now() where id=d.id;
  else
    raise exception 'Unknown verification request action';
  end if;

  insert into public.deal_audit_logs(deal_id,actor_id,event_type,metadata)
  values(d.id,u,'deal_verification_'||p_action,jsonb_build_object('target',target));

  return jsonb_build_object('ok',true,'action',p_action,'target',target);
end $$;

-- Browser clients may not forge immutable requirements or request state.
create or replace function public.trust_deal_trust_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='service_role' or coalesce(current_setting('ecomatch.trust_deal',true),'')='authorized' then return new; end if;
  if new.buyer_identity_verification_required is distinct from old.buyer_identity_verification_required
    or new.seller_identity_verification_required is distinct from old.seller_identity_verification_required
    or new.buyer_business_verification_required is distinct from old.buyer_business_verification_required
    or new.seller_business_verification_required is distinct from old.seller_business_verification_required
    or new.verification_requirement_locked is distinct from old.verification_requirement_locked
    or new.verification_requested_by is distinct from old.verification_requested_by
    or new.verification_requested_at is distinct from old.verification_requested_at
    or new.identity_verification_requested_for is distinct from old.identity_verification_requested_for
    or new.identity_verification_request_status is distinct from old.identity_verification_request_status
    or new.business_verification_requested_by is distinct from old.business_verification_requested_by
    or new.business_verification_requested_at is distinct from old.business_verification_requested_at
    or new.business_verification_requested_for is distinct from old.business_verification_requested_for
    or new.business_verification_request_status is distinct from old.business_verification_request_status then
    raise exception 'Deal verification requirements are server managed';
  end if;
  return new;
end $$;
drop trigger if exists trust_deal_trust_guard on public.deal_requests;
create trigger trust_deal_trust_guard before update on public.deal_requests for each row execute function public.trust_deal_trust_guard();

-- ---------------------------------------------------------------------------
-- 3) Correct frozen buyer/seller requirement mapping.
-- ---------------------------------------------------------------------------
create or replace function public.trust_snapshot_deal_requirements()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare p public.products%rowtype; buyer public.profiles%rowtype; seller public.profiles%rowtype;
begin
  select * into p from public.products where id=new.product_id;
  select * into buyer from public.profiles where id=new.buyer_id;
  select * into seller from public.profiles where id=new.seller_id;
  if p.id is null then raise exception 'Listing not found'; end if;
  if new.buyer_id=new.seller_id then raise exception 'Buyer and seller must be different users'; end if;
  if p.seller_id<>new.seller_id then raise exception 'Seller does not own this listing'; end if;

  -- Listing flags describe requirements for the BUYER.
  new.buyer_identity_verification_required:=coalesce(new.buyer_identity_verification_required,false) or coalesce(p.require_verified_buyer,false);
  new.buyer_business_verification_required:=coalesce(new.buyer_business_verification_required,false) or coalesce(p.gst_verified_buyer_required,false);

  new.buyer_identity_verified_at_deal:=case when buyer.verification_status in('verified','verified_demo') then coalesce(buyer.verified_at,now()) end;
  new.seller_identity_verified_at_deal:=case when seller.verification_status in('verified','verified_demo') then coalesce(seller.verified_at,now()) end;
  new.buyer_gst_verified_at_deal:=case when buyer.business_verification_status='verified' then buyer.gst_verified_at end;
  new.seller_gst_verified_at_deal:=case when seller.business_verification_status='verified' then seller.gst_verified_at end;
  new.verification_requirement_locked:=true;
  return new;
end $$;

drop trigger if exists trust_snapshot_deal_requirements on public.deal_requests;
create trigger trust_snapshot_deal_requirements before insert on public.deal_requests for each row execute function public.trust_snapshot_deal_requirements();

-- ---------------------------------------------------------------------------
-- 4) Business verification is server-managed and fails closed.
--    Protect not only status but identity of the verified business as well.
-- ---------------------------------------------------------------------------
create or replace function public.trust_block_client_verification_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('ecomatch.trust_admin',true),'')<>'authorized'
    and (
      new.account_type is distinct from old.account_type
      or new.business_name is distinct from old.business_name
      or new.trade_name is distinct from old.trade_name
      or new.gstin is distinct from old.gstin
      or new.business_verification_status is distinct from old.business_verification_status
      or new.gst_verified_at is distinct from old.gst_verified_at
      or new.gst_verification_method is distinct from old.gst_verification_method
      or new.business_verification_reference is distinct from old.business_verification_reference
    ) then
    raise exception 'Business verification fields are server managed';
  end if;
  return new;
end $$;

drop trigger if exists trust_block_client_verification_update on public.profiles;
create trigger trust_block_client_verification_update before update on public.profiles for each row execute function public.trust_block_client_verification_update();

create or replace function public.trust_submit_business_verification(p_business_name text,p_trade_name text,p_gstin text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare u uuid:=auth.uid(); normalized text:=upper(trim(coalesce(p_gstin,'')));
begin
  if u is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_business_name,'')))<2 then raise exception 'Business name is required'; end if;
  if normalized !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then raise exception 'Invalid GSTIN format'; end if;
  perform set_config('ecomatch.trust_admin','authorized',true);
  update public.profiles set account_type='business',business_name=left(trim(p_business_name),160),trade_name=nullif(left(trim(coalesce(p_trade_name,'')),160),''),
    gstin=normalized,business_verification_status='pending',gst_verified_at=null,gst_verification_method='manual_official_lookup',business_verification_reference=null where id=u;
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
  values(u,'business_verification',u::text,'gst_verification_submitted',jsonb_build_object('gstin_last4',right(normalized,4)));
end $$;

create or replace function public.trust_admin_business_review(p_user uuid,p_action text,p_legal_name text default null,p_trade_name text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare u uuid:=auth.uid(); status_value text;
begin
  if not exists(select 1 from public.profiles where id=u and role='admin' and coalesce(account_status,'active')='active' and not coalesce(is_banned,false)) then raise exception 'Admin access required'; end if;
  if not exists(select 1 from public.profiles where id=p_user and account_type='business' and gstin is not null) then raise exception 'Business verification submission not found'; end if;
  status_value:=case p_action when 'verify' then 'verified' when 'reject' then 'failed' when 'review' then 'manual_review' else null end;
  if status_value is null then raise exception 'Invalid business review action'; end if;
  perform set_config('ecomatch.trust_admin','authorized',true);
  update public.profiles set business_verification_status=status_value,
    gst_verified_at=case when status_value='verified' then now() else null end,
    gst_verification_method=case when status_value='verified' then 'manual_official_lookup' else gst_verification_method end,
    business_name=coalesce(nullif(trim(p_legal_name),''),business_name),trade_name=coalesce(nullif(trim(p_trade_name),''),trade_name)
  where id=p_user;
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
  values(u,'business_verification',p_user::text,'gst_verification_'||case status_value when 'verified' then 'verified' when 'failed' then 'rejected' else 'review' end,
    jsonb_build_object('method','manual_official_lookup'));
end $$;

-- ---------------------------------------------------------------------------
-- 5) Safe public trust view. GSTIN itself remains private.
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles with (security_barrier=true) as
select
  -- Preserve the Phase 18 column order so CREATE OR REPLACE VIEW succeeds on
  -- already-migrated databases; new safe trust fields are appended.
  id,full_name,avatar_url,verification_status,trust_score,
  round(latitude::numeric,2) as latitude,round(longitude::numeric,2) as longitude,
  case when latitude is not null and longitude is not null then 'Approximate area only' else null end::text as location_name,
  verification_method,account_type,business_name,trade_name,
  business_verification_status,gst_verification_method
from public.profiles;
grant select on public.public_profiles to anon,authenticated;

-- Phase 26 initially made every submitted GSTIN globally unique. A pending or
-- malicious submission must not be able to squat a GSTIN and block the real
-- business from submitting. Only an actually verified GST identity is unique.
drop index if exists public.profiles_gstin_unique_when_present;
create index if not exists profiles_gstin_lookup_idx on public.profiles(gstin) where gstin is not null;
create unique index if not exists profiles_verified_gstin_unique
  on public.profiles(gstin)
  where gstin is not null and business_verification_status='verified';

-- ---------------------------------------------------------------------------
-- 6) Deal state/evidence hardening. Participants may negotiate and propose a
--    meeting, but cannot forge completion, disputes, disclosure evidence or
--    the counterparty's meeting confirmation.
-- ---------------------------------------------------------------------------
create or replace function public.trust_deal_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='service_role'
    or coalesce(current_setting('ecomatch.handover_rpc',true),'')='authorized'
    or coalesce(current_setting('ecomatch.trust_deal',true),'')='authorized' then return new; end if;
  if new.buyer_id<>old.buyer_id or new.seller_id<>old.seller_id or new.product_id<>old.product_id then raise exception 'Deal participants are immutable'; end if;
  if new.secure_state is distinct from old.secure_state or new.fulfilment_mode is distinct from old.fulfilment_mode or new.secure_version<>old.secure_version or new.secure_demo<>old.secure_demo then raise exception 'Use the server delivery workflow'; end if;
  if old.fulfilment_mode='secure_delivery' and new is distinct from old then raise exception 'Secure delivery requires server transitions'; end if;

  if (new.status='completed' and old.status<>'completed') or (new.status='disputed' and old.status<>'disputed') or new.is_disputed is distinct from old.is_disputed then
    raise exception 'Completion and disputes are server managed';
  end if;
  if new.buyer_disclosure_confirmation is distinct from old.buyer_disclosure_confirmation
    or new.buyer_disclosure_confirmed_at is distinct from old.buyer_disclosure_confirmed_at
    or new.disclosure_version_confirmed is distinct from old.disclosure_version_confirmed
    or new.condition_dispute_reason is distinct from old.condition_dispute_reason
    or new.condition_dispute_notes is distinct from old.condition_dispute_notes then
    raise exception 'Condition confirmation is server managed';
  end if;
  if new.buyer_meeting_confirmed is distinct from old.buyer_meeting_confirmed and auth.uid()<>old.buyer_id
    and not (new.buyer_meeting_confirmed=false and (new.meeting_location is distinct from old.meeting_location or new.meeting_at is distinct from old.meeting_at or new.meeting_latitude is distinct from old.meeting_latitude or new.meeting_longitude is distinct from old.meeting_longitude)) then
    raise exception 'Only the buyer may change buyer meeting confirmation';
  end if;
  if new.seller_meeting_confirmed is distinct from old.seller_meeting_confirmed and auth.uid()<>old.seller_id
    and not (new.seller_meeting_confirmed=false and (new.meeting_location is distinct from old.meeting_location or new.meeting_at is distinct from old.meeting_at or new.meeting_latitude is distinct from old.meeting_latitude or new.meeting_longitude is distinct from old.meeting_longitude)) then
    raise exception 'Only the seller may change seller meeting confirmation';
  end if;

  if new.status is distinct from old.status then
    if old.status='requested' and new.status in('accepted','rejected') and auth.uid()<>old.seller_id then raise exception 'Only seller may accept or reject a request'; end if;
    if old.status='requested' and new.status='cancelled' and auth.uid()<>old.buyer_id then raise exception 'Only buyer may cancel a pending request'; end if;
    if old.status in('accepted','meeting_planned','exchange_ready') and new.status='cancelled' then null;
    elsif old.status='accepted' and new.status='meeting_planned' then null;
    elsif old.status in('accepted','meeting_planned') and new.status='exchange_ready' then
      if not coalesce(new.buyer_meeting_confirmed,false) or not coalesce(new.seller_meeting_confirmed,false) or new.meeting_at is null or new.meeting_latitude is null or new.meeting_longitude is null then raise exception 'Both parties must confirm the agreed meeting before handover'; end if;
    elsif old.status='requested' and new.status in('accepted','rejected','cancelled') then null;
    elsif new.status<>old.status then raise exception 'Invalid direct deal state transition';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trust_deal_guard on public.deal_requests;
create trigger trust_deal_guard before update on public.deal_requests for each row execute function public.trust_deal_guard();

-- Meeting edits intentionally invalidate all previous physical-handover proof.
-- This trigger sorts after trust_handover_guard, so a normal meeting proposal can
-- clear stale server evidence without letting the browser set evidence to true.
create or replace function public.trust_meeting_security_reset()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.meeting_location is distinct from old.meeting_location
    or new.meeting_at is distinct from old.meeting_at
    or new.meeting_latitude is distinct from old.meeting_latitude
    or new.meeting_longitude is distinct from old.meeting_longitude then
    if auth.uid() is null or auth.uid() not in(old.buyer_id,old.seller_id) then raise exception 'Meeting access denied'; end if;
    new.meeting_proposed_by := auth.uid();
    new.buyer_meeting_confirmed := auth.uid()=old.buyer_id;
    new.seller_meeting_confirmed := auth.uid()=old.seller_id;
    new.proximity_verified:=false; new.proximity_distance_meters:=null;
    new.buyer_checkin_latitude:=null; new.buyer_checkin_longitude:=null; new.buyer_checked_in_at:=null;
    new.seller_checkin_latitude:=null; new.seller_checkin_longitude:=null; new.seller_checked_in_at:=null;
    new.exchange_code_hash:=null; new.exchange_code_generated_at:=null; new.exchange_code_expires_at:=null; new.exchange_code_attempts:=0; new.exchange_code_verified_at:=null; new.qr_verified_at:=null;
    new.buyer_handover_confirmed_at:=null; new.seller_handover_confirmed_at:=null;
    if old.status not in('completed','cancelled','rejected','disputed') then new.status:='meeting_planned'; end if;
    update public.deal_qr_tokens set used_at=coalesce(used_at,now()) where deal_id=old.id and used_at is null;
  end if;
  return new;
end $$;

drop trigger if exists trust_meeting_security_reset on public.deal_requests;
create trigger trust_meeting_security_reset before update on public.deal_requests for each row execute function public.trust_meeting_security_reset();

-- Patch dispute/condition RPCs so protected evidence is changed only inside a
-- trusted server transaction.
create or replace function public.raise_deal_dispute(p_deal_id uuid,p_reason text,p_description text)
returns uuid
language plpgsql
security definer
set search_path=public,extensions
as $$
declare d public.deal_requests%rowtype; dispute_id uuid; other_user uuid;
begin
  select * into d from public.deal_requests where id=p_deal_id for update;
  if d.id is null or auth.uid() is null or auth.uid() not in(d.buyer_id,d.seller_id) then raise exception 'Deal access denied'; end if;
  if d.status in('completed','cancelled','rejected') or coalesce(d.is_disputed,false) then raise exception 'This deal cannot be disputed now'; end if;
  if length(trim(coalesce(p_reason,'')))<2 or length(trim(coalesce(p_description,'')))<5 then raise exception 'Provide a dispute reason and description'; end if;
  insert into public.deal_disputes(deal_id,raised_by,reason,description,status) values(d.id,auth.uid(),left(trim(p_reason),120),left(trim(p_description),2000),'OPEN') returning id into dispute_id;
  perform set_config('ecomatch.trust_deal','authorized',true);
  update public.deal_requests set status='disputed',is_disputed=true,updated_at=now() where id=d.id;
  insert into public.deal_audit_logs(deal_id,actor_id,event_type,metadata) values(d.id,auth.uid(),'DISPUTE_RAISED',jsonb_build_object('reason',left(trim(p_reason),120),'dispute_id',dispute_id));
  other_user:=case when auth.uid()=d.buyer_id then d.seller_id else d.buyer_id end;
  insert into public.deal_notifications(user_id,deal_id,type,title,message,action_url) values(other_user,d.id,'DISPUTE_RAISED','Deal Placed On Hold: Dispute Raised','A dispute has been submitted for deal #'||d.deal_code||'. Handover is temporarily frozen.','/deals/'||d.id);
  return dispute_id;
end $$;

create or replace function public.trust_confirm_condition_disclosure(p_deal_id uuid,p_matches boolean,p_reason text default null,p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare d public.deal_requests%rowtype; disclosure_version_value integer;
begin
  select * into d from public.deal_requests where id=p_deal_id for update;
  if d.id is null then raise exception 'Deal not found'; end if;
  if auth.uid()<>d.buyer_id then raise exception 'Only the buyer can confirm the disclosed condition'; end if;
  if d.status in('completed','cancelled','rejected') or coalesce(d.is_disputed,false) then raise exception 'This deal is not accepting condition confirmation'; end if;
  select disclosure_version into disclosure_version_value from public.product_condition_disclosures where product_id=d.product_id;
  if disclosure_version_value is null then return jsonb_build_object('ok',true,'required',false); end if;
  perform set_config('ecomatch.trust_deal','authorized',true);
  if p_matches then
    update public.deal_requests set buyer_disclosure_confirmation='matches',buyer_disclosure_confirmed_at=now(),disclosure_version_confirmed=disclosure_version_value,condition_dispute_reason=null,condition_dispute_notes=null where id=d.id;
    return jsonb_build_object('ok',true,'required',true,'status','confirmed','version',disclosure_version_value);
  end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'Select what differs from the seller disclosure'; end if;
  update public.deal_requests set buyer_disclosure_confirmation='does_not_match',buyer_disclosure_confirmed_at=now(),disclosure_version_confirmed=disclosure_version_value,condition_dispute_reason=left(trim(p_reason),120),condition_dispute_notes=left(trim(coalesce(p_notes,'')),2000),is_disputed=true,status='disputed',updated_at=now() where id=d.id;
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(auth.uid(),'deal',d.id::text,'condition_dispute',jsonb_build_object('reason',left(trim(p_reason),120),'disclosure_version',disclosure_version_value));
  return jsonb_build_object('ok',true,'required',true,'status','condition_dispute');
end $$;

-- ---------------------------------------------------------------------------
-- 7) Handover evidence + proximity are server-managed.
-- ---------------------------------------------------------------------------
create or replace function public.trust_handover_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='service_role'
    or coalesce(current_setting('ecomatch.handover_rpc',true),'')='authorized'
    or coalesce(current_setting('ecomatch.trust_deal',true),'')='authorized' then return new; end if;
  if tg_op='INSERT' then
    if new.qr_verified_at is not null or new.status<>'requested' or new.fulfilment_mode<>'self_pickup' or new.secure_state is not null or new.secure_version<>0 or new.secure_demo
      or new.exchange_code_hash is not null or new.exchange_code_verified_at is not null or new.buyer_handover_confirmed_at is not null or new.seller_handover_confirmed_at is not null
      or new.completed_at is not null or coalesce(new.proximity_verified,false) or new.proximity_distance_meters is not null
      or new.buyer_checkin_latitude is not null or new.buyer_checkin_longitude is not null or new.buyer_checked_in_at is not null
      or new.seller_checkin_latitude is not null or new.seller_checkin_longitude is not null or new.seller_checked_in_at is not null then
      raise exception 'Handover is server managed';
    end if;
  elsif new.qr_verified_at is distinct from old.qr_verified_at
    or new.exchange_code_hash is distinct from old.exchange_code_hash
    or new.exchange_code_generated_at is distinct from old.exchange_code_generated_at
    or new.exchange_code_expires_at is distinct from old.exchange_code_expires_at
    or new.exchange_code_attempts is distinct from old.exchange_code_attempts
    or new.exchange_code_verified_at is distinct from old.exchange_code_verified_at
    or new.buyer_handover_confirmed_at is distinct from old.buyer_handover_confirmed_at
    or new.seller_handover_confirmed_at is distinct from old.seller_handover_confirmed_at
    or new.completed_at is distinct from old.completed_at
    or new.proximity_verified is distinct from old.proximity_verified
    or new.proximity_distance_meters is distinct from old.proximity_distance_meters
    or new.buyer_checkin_latitude is distinct from old.buyer_checkin_latitude
    or new.buyer_checkin_longitude is distinct from old.buyer_checkin_longitude
    or new.buyer_checked_in_at is distinct from old.buyer_checked_in_at
    or new.seller_checkin_latitude is distinct from old.seller_checkin_latitude
    or new.seller_checkin_longitude is distinct from old.seller_checkin_longitude
    or new.seller_checked_in_at is distinct from old.seller_checked_in_at
    or (new.status='completed' and old.status<>'completed') then
    raise exception 'Handover is server managed';
  end if;
  return new;
end $$;

drop trigger if exists trust_handover_guard on public.deal_requests;
create trigger trust_handover_guard before insert or update on public.deal_requests for each row execute function public.trust_handover_guard();

create or replace function public.verify_deal_proximity(
  p_deal_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_is_buyer boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  d public.deal_requests%rowtype;
  current_dist double precision;
  other_dist double precision;
  peer_dist double precision;
  other_lat double precision;
  other_lng double precision;
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
  verified boolean:=false;
begin
  select * into d from public.deal_requests where id=p_deal_id for update;
  if d.id is null or auth.uid() is null or auth.uid() not in(d.buyer_id,d.seller_id) then raise exception 'Deal access denied'; end if;
  if d.status not in('accepted','meeting_planned','meeting_confirmed','handover_ready','exchange_ready') or d.fulfilment_mode<>'self_pickup' or coalesce(d.is_disputed,false) then raise exception 'Deal is not ready for proximity check'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Invalid coordinates'; end if;
  if d.meeting_latitude is null or d.meeting_longitude is null then raise exception 'Save the agreed meeting coordinates first'; end if;
  if (auth.uid()=d.buyer_id) is distinct from p_is_buyer then raise exception 'Participant role mismatch'; end if;

  perform set_config('ecomatch.handover_rpc','authorized',true);
  if auth.uid()=d.buyer_id then
    update public.deal_requests set buyer_checkin_latitude=p_lat,buyer_checkin_longitude=p_lng,buyer_checked_in_at=now(),updated_at=now() where id=d.id;
    other_lat:=d.seller_checkin_latitude; other_lng:=d.seller_checkin_longitude;
  else
    update public.deal_requests set seller_checkin_latitude=p_lat,seller_checkin_longitude=p_lng,seller_checked_in_at=now(),updated_at=now() where id=d.id;
    other_lat:=d.buyer_checkin_latitude; other_lng:=d.buyer_checkin_longitude;
  end if;

  dlat:=radians(p_lat-d.meeting_latitude); dlon:=radians(p_lng-d.meeting_longitude);
  a:=sin(dlat/2)^2+cos(radians(d.meeting_latitude))*cos(radians(p_lat))*sin(dlon/2)^2;
  c:=2*atan2(sqrt(greatest(0,a)),sqrt(greatest(0,1-a))); current_dist:=6371000*c;

  if other_lat is not null and other_lng is not null then
    dlat:=radians(other_lat-d.meeting_latitude); dlon:=radians(other_lng-d.meeting_longitude);
    a:=sin(dlat/2)^2+cos(radians(d.meeting_latitude))*cos(radians(other_lat))*sin(dlon/2)^2;
    c:=2*atan2(sqrt(greatest(0,a)),sqrt(greatest(0,1-a))); other_dist:=6371000*c;
    dlat:=radians(p_lat-other_lat); dlon:=radians(p_lng-other_lng);
    a:=sin(dlat/2)^2+cos(radians(other_lat))*cos(radians(p_lat))*sin(dlon/2)^2;
    c:=2*atan2(sqrt(greatest(0,a)),sqrt(greatest(0,1-a))); peer_dist:=6371000*c;
    verified:=current_dist<=250 and other_dist<=250 and peer_dist<=250;
  end if;

  update public.deal_requests set proximity_verified=verified,
    proximity_distance_meters=case when peer_dist is not null then peer_dist else current_dist end,
    updated_at=now() where id=d.id;

  return jsonb_build_object('verified',verified,'distance_to_meeting_meters',round(current_dist),
    'counterparty_distance_to_meeting_meters',case when other_dist is null then null else round(other_dist) end,
    'distance_to_peer_meters',case when peer_dist is null then null else round(peer_dist) end,
    'waiting_for_counterparty',other_lat is null or other_lng is null);
end $$;

grant execute on function public.verify_deal_proximity(uuid,double precision,double precision,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Listing ownership guard understands the trusted handover transaction.
--    Direct browser ownership/moderation writes remain blocked.
-- ---------------------------------------------------------------------------
create or replace function public.trust_listing_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='service_role' or coalesce(current_setting('ecomatch.handover_rpc',true),'')='authorized' then
    return new;
  end if;
  if not public.trust_active(new.seller_id) then raise exception 'Account restricted'; end if;
  if public.trust_is_admin() then
    if new.status='approved' and (tg_op='INSERT' or old.status is distinct from new.status) then
      new.approval_method:='admin';
      new.approved_at:=now();
    end if;
    return new;
  end if;
  if tg_op='INSERT' then
    new.status:='pending_review';
    new.safety_score:=null;
    new.approval_method:=null;
    new.approved_at:=null;
    new.moderation_version:=0;
  else
    if new.seller_id<>old.seller_id or new.current_owner_id is distinct from old.current_owner_id or new.sold_deal_id is distinct from old.sold_deal_id then
      raise exception 'Ownership is server managed';
    end if;
    if new.safety_score is distinct from old.safety_score or new.approval_method is distinct from old.approval_method or new.approved_at is distinct from old.approved_at or new.status is distinct from old.status then
      raise exception 'Moderation is server managed';
    end if;
    if (to_jsonb(new)-array['updated_at','moderation_version']) is distinct from (to_jsonb(old)-array['updated_at','moderation_version']) then
      new.status:='pending_review';
      new.safety_score:=null;
      new.approval_method:=null;
      new.approved_at:=null;
      new.moderation_version:=old.moderation_version+1;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trust_listing_guard on public.products;
create trigger trust_listing_guard before insert or update on public.products for each row execute function public.trust_listing_guard();


-- A seller may remove an unused listing, but a sold/transferred listing or one
-- attached to an active transaction is part of the ownership/audit trail and
-- must not disappear from underneath the ledger.
create or replace function public.trust_listing_delete_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='service_role' then return old; end if;
  if auth.uid() is null or auth.uid()<>old.seller_id then raise exception 'Only the listing seller may delete this listing'; end if;
  if old.status='sold' or (old.current_owner_id is not null and old.current_owner_id<>old.seller_id)
     or exists(select 1 from public.ownership_events e where e.product_id=old.id)
     or exists(
       select 1 from public.deal_requests d
       where d.product_id=old.id
         and d.status not in('cancelled','rejected','expired')
     ) then
    raise exception 'This listing is part of an active or completed transaction and cannot be deleted';
  end if;
  return old;
end $$;

drop trigger if exists trust_listing_delete_guard on public.products;
create trigger trust_listing_delete_guard
before delete on public.products
for each row execute function public.trust_listing_delete_guard();

-- ---------------------------------------------------------------------------
-- 9) Authoritative, atomic self-pickup finalizer.
--    OTP and QR share exchange_code_verified_at after server verification, but
--    QR does NOT depend on OTP-specific exchange_code_expires_at.
-- ---------------------------------------------------------------------------
create or replace function public.complete_secure_handover(p_deal uuid)
returns text
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  d public.deal_requests%rowtype;
  p public.products%rowtype;
  b public.profiles%rowtype;
  s public.profiles%rowtype;
  u uuid:=auth.uid();
  previous text;
  h text;
  disclosure_version_value integer;
  identity_target_status text;
  business_target_status text;
  event_time timestamptz:=clock_timestamp();
begin
  select * into d from public.deal_requests where id=p_deal for update;
  if d.id is null or u is null or u not in(d.buyer_id,d.seller_id) or d.buyer_id=d.seller_id then raise exception 'Handover access denied'; end if;
  if d.status='completed' and exists(select 1 from public.ownership_events where deal_id=d.id) then return 'completed'; end if;
  if d.fulfilment_mode<>'self_pickup' then raise exception 'Use the secure-delivery completion workflow'; end if;
  if d.status not in('accepted','meeting_planned','meeting_confirmed','handover_ready','exchange_ready','handover_verified') or coalesce(d.is_disputed,false) then raise exception 'Deal cannot be completed'; end if;

  -- Both OTP and QR are individually expiry-checked by their verification RPCs.
  -- Final confirmation additionally requires a recent successful server verification.
  if d.exchange_code_verified_at is null or d.exchange_code_verified_at < now()-interval '15 minutes' or not coalesce(d.proximity_verified,false) then
    raise exception 'A recent server-verified OTP or QR handover and proximity check are required';
  end if;

  select * into b from public.profiles where id=d.buyer_id;
  select * into s from public.profiles where id=d.seller_id;
  if b.id is null or s.id is null then raise exception 'Deal participant profile missing'; end if;

  if (d.buyer_identity_verification_required and b.verification_status not in('verified','verified_demo'))
    or (d.seller_identity_verification_required and s.verification_status not in('verified','verified_demo')) then
    raise exception 'Required identity verification is incomplete';
  end if;
  if (d.buyer_business_verification_required and b.business_verification_status<>'verified')
    or (d.seller_business_verification_required and s.business_verification_status<>'verified') then
    raise exception 'Required GST business verification is incomplete';
  end if;

  if d.identity_verification_request_status in('pending','declined') and d.identity_verification_requested_for is not null then
    select verification_status into identity_target_status from public.profiles where id=d.identity_verification_requested_for;
    if identity_target_status not in('verified','verified_demo') then raise exception 'Requested identity verification is still pending; requester may waive it or cancel the deal'; end if;
  end if;
  if d.business_verification_request_status in('pending','declined') and d.business_verification_requested_for is not null then
    select business_verification_status into business_target_status from public.profiles where id=d.business_verification_requested_for;
    if business_target_status<>'verified' then raise exception 'Requested business verification is still pending; requester may waive it or cancel the deal'; end if;
  end if;

  select disclosure_version into disclosure_version_value from public.product_condition_disclosures where product_id=d.product_id;
  if disclosure_version_value is not null and (d.buyer_disclosure_confirmation<>'matches' or d.disclosure_version_confirmed<>disclosure_version_value) then
    raise exception 'Buyer has not confirmed the current seller condition disclosure';
  end if;

  perform set_config('ecomatch.handover_rpc','authorized',true);
  update public.deal_requests set
    buyer_handover_confirmed_at=case when u=buyer_id then coalesce(buyer_handover_confirmed_at,now()) else buyer_handover_confirmed_at end,
    seller_handover_confirmed_at=case when u=seller_id then coalesce(seller_handover_confirmed_at,now()) else seller_handover_confirmed_at end
  where id=d.id returning * into d;
  if d.buyer_handover_confirmed_at is null or d.seller_handover_confirmed_at is null then return 'waiting_for_other_party'; end if;

  select * into p from public.products where id=d.product_id for update;
  if p.id is null or p.seller_id<>d.seller_id or p.status<>'approved' or (p.current_owner_id is not null and p.current_owner_id<>d.seller_id) then
    raise exception 'Seller no longer owns this available product';
  end if;

  -- Serialize the global hash chain, not just one product, so the ledger cannot fork.
  perform pg_advisory_xact_lock(hashtext('ecomatch-ownership-ledger'));
  if exists(select 1 from public.ownership_events where deal_id=d.id) then
    update public.deal_requests set status='completed',completed_at=coalesce(completed_at,now()),updated_at=now() where id=d.id;
    return 'completed';
  end if;

  select event_hash into previous from public.ownership_events order by created_at desc,id desc limit 1;
  previous:=coalesce(previous,'GENESIS');
  h:=encode(digest(concat_ws('|',d.id,d.product_id,d.buyer_id,d.seller_id,previous,event_time),'sha256'),'hex');

  update public.products set status='sold',current_owner_id=d.buyer_id,sold_deal_id=d.id where id=d.product_id;
  update public.deal_requests set status='completed',completed_at=event_time,updated_at=event_time,exchange_code_hash=null where id=d.id;
  update public.deal_qr_tokens set used_at=coalesce(used_at,event_time) where deal_id=d.id and used_at is null;
  insert into public.ownership_events(product_id,deal_id,deal_code,previous_owner_id,new_owner_id,previous_hash,event_hash)
    values(d.product_id,d.id,d.deal_code,d.seller_id,d.buyer_id,previous,h);
  insert into public.deal_audit_logs(deal_id,actor_id,event_type,metadata)
    values(d.id,u,'secure_handover_completed',jsonb_build_object('verification_method',case when d.qr_verified_at is not null then 'qr' else 'otp' end));
  return 'completed';
end $$;

-- Legacy confirm action now delegates to the authoritative finalizer; it no
-- longer contains an independent ownership-transfer implementation.
create or replace function public.trust_self_pickup(p_deal uuid,p_action text,p_code text default null)
returns text
language plpgsql
security definer
set search_path=public,extensions
as $$
declare d public.deal_requests%rowtype;u uuid:=auth.uid();code text;
begin
  select * into d from public.deal_requests where id=p_deal for update;
  if d.id is null or u is null or u not in(d.buyer_id,d.seller_id) or not public.trust_active(u) or d.fulfilment_mode<>'self_pickup' or coalesce(d.is_disputed,false) then raise exception 'Self-pickup access denied'; end if;
  if p_action='confirm' then return public.complete_secure_handover(p_deal); end if;
  if d.status not in('accepted','meeting_planned','meeting_confirmed','handover_ready','exchange_ready') then raise exception 'Deal is not ready for handover'; end if;
  perform set_config('ecomatch.handover_rpc','authorized',true);
  if p_action='generate' then
    if u<>d.seller_id or d.exchange_code_verified_at is not null then raise exception 'Seller must generate before verification'; end if;
    code:=lpad((100000+(get_byte(gen_random_bytes(1),0)*65536+get_byte(gen_random_bytes(1),0)*256+get_byte(gen_random_bytes(1),0))%900000)::text,6,'0');
    update public.deal_requests set exchange_code_hash=crypt(code,gen_salt('bf')),exchange_code_generated_at=now(),exchange_code_expires_at=now()+interval '10 minutes',exchange_code_attempts=0,buyer_handover_confirmed_at=null,seller_handover_confirmed_at=null where id=d.id;
    return code;
  elsif p_action='verify' then
    if u<>d.buyer_id then raise exception 'Only buyer may verify'; end if;
    if d.exchange_code_verified_at is not null or d.exchange_code_expires_at is null or d.exchange_code_expires_at<=now() or coalesce(d.exchange_code_attempts,0)>=5 or d.exchange_code_hash is null or p_code is null or p_code!~'^\d{6}$' then return 'false'; end if;
    update public.deal_requests set exchange_code_attempts=coalesce(exchange_code_attempts,0)+1 where id=d.id;
    if left(d.exchange_code_hash,3)='$2a' and crypt(p_code,d.exchange_code_hash)=d.exchange_code_hash then
      update public.deal_requests set exchange_code_verified_at=now(),status='exchange_ready' where id=d.id;
      return 'true';
    end if;
    return 'false';
  end if;
  raise exception 'Unknown handover action';
end $$;

-- Wrapper RPCs remain usable, but direct legacy transfer entrypoints do not.
create or replace function public.generate_deal_exchange_code(p_deal_id uuid) returns text language sql security definer set search_path=public as $$select public.trust_self_pickup(p_deal_id,'generate');$$;
create or replace function public.verify_deal_exchange_code(p_deal_id uuid,p_code text) returns boolean language sql security definer set search_path=public as $$select public.trust_self_pickup(p_deal_id,'verify',p_code)::boolean;$$;
create or replace function public.confirm_deal_handover(p_deal_id uuid) returns text language sql security definer set search_path=public as $$select public.complete_secure_handover(p_deal_id);$$;

revoke all on function public.trust_self_pickup(uuid,text,text) from public,anon,authenticated;
revoke all on function public.confirm_deal_handover(uuid) from public,anon,authenticated;
revoke all on function public.generate_deal_exchange_code(uuid) from public,anon;
revoke all on function public.verify_deal_exchange_code(uuid,text) from public,anon;
grant execute on function public.generate_deal_exchange_code(uuid) to authenticated;
grant execute on function public.verify_deal_exchange_code(uuid,text) to authenticated;

-- Readiness mirrors the same mandatory + optional-request rules as completion.
create or replace function public.trust_self_pickup_readiness(p_deal uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 d public.deal_requests%rowtype;p public.products%rowtype;b public.profiles%rowtype;s public.profiles%rowtype;
 disclosure integer;completed boolean;identity_request_ok boolean:=true;business_request_ok boolean:=true;
begin
 select * into d from public.deal_requests where id=p_deal;
 if d.id is null or auth.uid() is null or auth.uid() not in(d.buyer_id,d.seller_id) then raise exception 'Deal access denied'; end if;
 select * into p from public.products where id=d.product_id;
 select * into b from public.profiles where id=d.buyer_id;
 select * into s from public.profiles where id=d.seller_id;
 select disclosure_version into disclosure from public.product_condition_disclosures where product_id=d.product_id;
 completed:=d.status='completed' and exists(select 1 from public.ownership_events where deal_id=d.id);
 if d.identity_verification_request_status in('pending','declined') and d.identity_verification_requested_for is not null then
   identity_request_ok:=exists(select 1 from public.profiles where id=d.identity_verification_requested_for and verification_status in('verified','verified_demo'));
 end if;
 if d.business_verification_request_status in('pending','declined') and d.business_verification_requested_for is not null then
   business_request_ok:=exists(select 1 from public.profiles where id=d.business_verification_requested_for and business_verification_status='verified');
 end if;
 return jsonb_build_object(
  'completed',completed,
  'ready',not completed and d.fulfilment_mode='self_pickup' and d.status='exchange_ready' and not coalesce(d.is_disputed,false)
    and d.exchange_code_verified_at is not null and d.exchange_code_verified_at>=now()-interval '15 minutes' and coalesce(d.proximity_verified,false)
    and d.buyer_handover_confirmed_at is not null and d.seller_handover_confirmed_at is not null
    and (not d.buyer_identity_verification_required or b.verification_status in('verified','verified_demo'))
    and (not d.seller_identity_verification_required or s.verification_status in('verified','verified_demo'))
    and (not d.buyer_business_verification_required or b.business_verification_status='verified')
    and (not d.seller_business_verification_required or s.business_verification_status='verified')
    and identity_request_ok and business_request_ok
    and (disclosure is null or(d.buyer_disclosure_confirmation='matches' and d.disclosure_version_confirmed=disclosure))
    and p.id is not null and p.status='approved' and p.seller_id=d.seller_id and(p.current_owner_id is null or p.current_owner_id=d.seller_id),
  'requirements',jsonb_build_object(
    'selfPickup',d.fulfilment_mode='self_pickup','meetingReady',d.status='exchange_ready',
    'identity',((not d.buyer_identity_verification_required or b.verification_status in('verified','verified_demo')) and(not d.seller_identity_verification_required or s.verification_status in('verified','verified_demo'))),
    'business',((not d.buyer_business_verification_required or b.business_verification_status='verified') and(not d.seller_business_verification_required or s.business_verification_status='verified')),
    'identityRequest',identity_request_ok,'businessRequest',business_request_ok,
    'verification',d.exchange_code_verified_at is not null and d.exchange_code_verified_at>=now()-interval '15 minutes',
    'verificationMethod',case when d.qr_verified_at is not null then 'qr' when d.exchange_code_verified_at is not null then 'otp' else null end,
    'proximity',coalesce(d.proximity_verified,false),'buyerConfirmation',d.buyer_handover_confirmed_at is not null,
    'sellerConfirmation',d.seller_handover_confirmed_at is not null,
    'disclosure',disclosure is null or(d.buyer_disclosure_confirmation='matches' and d.disclosure_version_confirmed=disclosure),
    'noDispute',not coalesce(d.is_disputed,false),
    'sellerOwnsProduct',p.id is not null and p.status='approved' and p.seller_id=d.seller_id and(p.current_owner_id is null or p.current_owner_id=d.seller_id)
  )
 );
end $$;

-- One transfer event per deal. Do not roll back the whole presentation migration
-- because of historical test duplicates; the finalizer is still serialized/idempotent.
do $$
begin
  if exists(select deal_id from public.ownership_events where deal_id is not null group by deal_id having count(*)>1) then
    raise warning 'Legacy duplicate ownership events exist. New completion remains idempotent, but clean the legacy duplicates before adding the unique index.';
  else
    execute 'create unique index if not exists ownership_events_one_transfer_per_deal on public.ownership_events(deal_id) where deal_id is not null';
  end if;
end $$;

revoke all on function public.trust_deal_verification_request(uuid,text) from public,anon;
grant execute on function public.trust_deal_verification_request(uuid,text) to authenticated;
revoke all on function public.trust_submit_business_verification(text,text,text) from public,anon;
grant execute on function public.trust_submit_business_verification(text,text,text) to authenticated;
revoke all on function public.trust_admin_business_review(uuid,text,text,text) from public,anon;
grant execute on function public.trust_admin_business_review(uuid,text,text,text) to authenticated;
revoke all on function public.complete_secure_handover(uuid) from public,anon;
grant execute on function public.complete_secure_handover(uuid) to authenticated;

-- Final presentation admin actions use service-role routes, not browser table writes.
create or replace function public.trust_admin_review_communication_event(
  p_actor uuid,
  p_event uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin' and account_status='active' and not coalesce(is_banned,false)) then
    raise exception 'Active admin required';
  end if;
  if p_status not in('REVIEWED','FALSE_POSITIVE') or length(trim(coalesce(p_reason,'')))<10 then
    raise exception 'Valid review status and reason required';
  end if;
  update public.communication_risk_events
  set review_status=p_status, admin_notes=p_reason, action_taken=case when p_status='FALSE_POSITIVE' then 'dismiss' else 'review' end
  where id=p_event;
  if not found then raise exception 'Safety event not found'; end if;
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
  values(p_actor,'communication_risk_event',p_event::text,'admin_review',jsonb_build_object('status',p_status,'reason',p_reason));
end $$;

create or replace function public.trust_admin_resolve_dispute(
  p_actor uuid,
  p_dispute uuid,
  p_resolution text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare d public.deal_disputes%rowtype;deal public.deal_requests%rowtype;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin' and account_status='active' and not coalesce(is_banned,false)) then
    raise exception 'Active admin required';
  end if;
  if p_resolution not in('RESOLVED_COMPLETED','DISMISSED') or length(trim(coalesce(p_reason,'')))<10 then
    raise exception 'Valid resolution and reason required';
  end if;
  select * into d from public.deal_disputes where id=p_dispute for update;
  if d.id is null then raise exception 'Dispute not found'; end if;
  if d.status not in('OPEN','INVESTIGATING') then raise exception 'Dispute is already resolved'; end if;
  select * into deal from public.deal_requests where id=d.deal_id for update;
  if deal.id is null then raise exception 'Deal not found'; end if;

  update public.deal_disputes
  set status=p_resolution,resolution_notes=p_reason,resolved_at=now()
  where id=d.id;

  -- Resolving a dispute never fabricates ownership completion. It only clears
  -- the freeze so the parties can continue through the secure handover gates.
  perform set_config('ecomatch.trust_deal','authorized',true);
  update public.deal_requests
  set is_disputed=false,
      status=case
        when status='disputed' and exchange_code_verified_at is not null then 'exchange_ready'
        when status='disputed' and meeting_at is not null then 'meeting_planned'
        when status='disputed' then 'accepted'
        else status
      end,
      updated_at=now()
  where id=deal.id and status<>'completed';

  insert into public.deal_audit_logs(deal_id,actor_id,event_type,metadata)
  values(deal.id,p_actor,'dispute_resolved',jsonb_build_object('resolution',p_resolution,'reason',p_reason));
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
  values(p_actor,'deal_dispute',d.id::text,'resolve',jsonb_build_object('dealId',deal.id,'resolution',p_resolution,'reason',p_reason));
end $$;

revoke all on function public.trust_admin_review_communication_event(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.trust_admin_review_communication_event(uuid,uuid,text,text) to service_role;
revoke all on function public.trust_admin_resolve_dispute(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.trust_admin_resolve_dispute(uuid,uuid,text,text) to service_role;
-- Keep administrative warnings/bans compatible with the identity guard. A ban
-- restricts the account through is_banned/account_status; it does not rewrite
-- identity verification evidence into a synthetic "banned" KYC state.
create or replace function public.admin_issue_warning_or_ban(
  p_user_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u uuid:=auth.uid();
  warnings integer;
begin
  if not exists(select 1 from public.profiles where id=u and role='admin' and account_status='active' and not coalesce(is_banned,false)) then
    return jsonb_build_object('success',false,'error','Unauthorized. Admin only.');
  end if;
  if p_user_id=u then return jsonb_build_object('success',false,'error','Admin cannot moderate their own account here.'); end if;
  if length(trim(coalesce(p_reason,'')))<10 then return jsonb_build_object('success',false,'error','A review reason of at least 10 characters is required.'); end if;
  select coalesce(warning_count,0) into warnings from public.profiles where id=p_user_id for update;
  if not found then return jsonb_build_object('success',false,'error','User not found.'); end if;

  if p_action='warning' then
    warnings:=warnings+1;
    if warnings>=2 then
      update public.profiles set warning_count=warnings,is_banned=true,account_status='safety_blocked',banned_at=now(),ban_reason=trim(p_reason) where id=p_user_id;
      insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
      values(u,'profile',p_user_id::text,'admin_ban',jsonb_build_object('reason',trim(p_reason),'warnings',warnings));
      return jsonb_build_object('success',true,'action','banned','warnings',warnings);
    end if;
    update public.profiles set warning_count=warnings,warning_reason=trim(p_reason) where id=p_user_id;
    insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
    values(u,'profile',p_user_id::text,'admin_warning',jsonb_build_object('reason',trim(p_reason),'warnings',warnings));
    return jsonb_build_object('success',true,'action','warned','warnings',warnings);
  elsif p_action='ban' then
    update public.profiles set is_banned=true,account_status='safety_blocked',banned_at=now(),ban_reason=trim(p_reason) where id=p_user_id;
    insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
    values(u,'profile',p_user_id::text,'admin_ban',jsonb_build_object('reason',trim(p_reason),'warnings',warnings));
    return jsonb_build_object('success',true,'action','banned','warnings',warnings);
  end if;
  return jsonb_build_object('success',false,'error','Invalid action');
end $$;

revoke all on function public.admin_issue_warning_or_ban(uuid,text,text) from public,anon;
grant execute on function public.admin_issue_warning_or_ban(uuid,text,text) to authenticated;



-- ---------------------------------------------------------------------------
-- 13) Final marketplace integrity hardening.
--     Freeze authoritative prices/offers, fail closed on verification writes,
--     and force chat inserts through the safety RPC.
-- ---------------------------------------------------------------------------
create or replace function public.trust_block_client_verification_update()
returns trigger
language plpgsql
as $$
begin
  -- Trusted admin/service paths may set verification outcomes.
  if coalesce(current_setting('ecomatch.trust_admin',true),'')='authorized'
     or coalesce(auth.role(),'')='service_role' then
    return new;
  end if;

  -- A newly-created profile may declare that it is a business, but it may not
  -- self-assert a verification result/method/reference.
  if tg_op='INSERT' then
    if coalesce(new.business_verification_status,'unverified')<>'unverified'
       or new.gst_verified_at is not null
       or new.gst_verification_method is not null
       or new.business_verification_reference is not null then
      raise exception 'Business verification results are server managed';
    end if;
    return new;
  end if;

  if new.account_type is distinct from old.account_type
    or new.business_name is distinct from old.business_name
    or new.trade_name is distinct from old.trade_name
    or new.gstin is distinct from old.gstin
    or new.business_verification_status is distinct from old.business_verification_status
    or new.gst_verified_at is distinct from old.gst_verified_at
    or new.gst_verification_method is distinct from old.gst_verification_method
    or new.business_verification_reference is distinct from old.business_verification_reference then
    raise exception 'Business verification fields are server managed';
  end if;
  return new;
end $$;

drop trigger if exists trust_block_client_verification_update on public.profiles;
create trigger trust_block_client_verification_update
before insert or update on public.profiles
for each row execute function public.trust_block_client_verification_update();

create or replace function public.trust_offer_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  u uuid:=auth.uid();
  p public.products%rowtype;
begin
  if coalesce(auth.role(),'')='service_role' then return new; end if;
  if u is null then raise exception 'Authentication required'; end if;

  if tg_op='INSERT' then
    select * into p from public.products where id=new.product_id;
    if p.id is null or p.status<>'approved' then raise exception 'Listing is not available'; end if;
    if p.seller_id is distinct from new.seller_id then raise exception 'Invalid seller'; end if;
    if p.current_owner_id is not null and p.current_owner_id<>p.seller_id then raise exception 'Seller no longer owns this item'; end if;
    if new.buyer_id<>u or new.buyer_id=new.seller_id then raise exception 'Only the signed-in buyer may create this offer'; end if;
    if new.offer_price is null or new.offer_price<=0 then raise exception 'Offer price must be positive'; end if;
    new.status:='pending';
    new.counter_price:=null;
    new.agreed_price:=null;
    new.last_action_by:=u;
    return new;
  end if;

  if new.product_id<>old.product_id or new.buyer_id<>old.buyer_id or new.seller_id<>old.seller_id
     or new.offer_price is distinct from old.offer_price then
    raise exception 'Offer identity and original amount are immutable';
  end if;
  if u not in(old.buyer_id,old.seller_id) then raise exception 'Offer access denied'; end if;
  if old.status in('accepted','rejected','cancelled') and new is distinct from old then
    raise exception 'Finalized offers cannot be changed';
  end if;

  if old.status='pending' then
    if new.status='cancelled' then
      if u<>old.buyer_id then raise exception 'Only buyer may cancel a pending offer'; end if;
      new.counter_price:=old.counter_price; new.agreed_price:=null;
    elsif new.status='rejected' then
      if u<>old.seller_id then raise exception 'Only seller may reject a pending offer'; end if;
      new.counter_price:=old.counter_price; new.agreed_price:=null;
    elsif new.status='countered' then
      if u<>old.seller_id then raise exception 'Only seller may counter a pending offer'; end if;
      if new.counter_price is null or new.counter_price<=0 then raise exception 'Counter price must be positive'; end if;
      new.agreed_price:=null;
    elsif new.status='accepted' then
      if u<>old.seller_id then raise exception 'Only seller may accept the original buyer offer'; end if;
      new.counter_price:=old.counter_price;
      new.agreed_price:=old.offer_price;
    elsif new.status='pending' then
      -- Only timestamp/no-op refresh is permitted; monetary fields stay frozen.
      new.counter_price:=old.counter_price; new.agreed_price:=old.agreed_price;
    else
      raise exception 'Invalid offer transition';
    end if;
  elsif old.status='countered' then
    if new.status='accepted' then
      if u<>old.buyer_id then raise exception 'Only buyer may accept a seller counter-offer'; end if;
      if old.counter_price is null or old.counter_price<=0 then raise exception 'Counter price is missing'; end if;
      new.counter_price:=old.counter_price; new.agreed_price:=old.counter_price;
    elsif new.status in('cancelled','rejected') then
      if u<>old.buyer_id then raise exception 'Only buyer may decline a seller counter-offer'; end if;
      new.counter_price:=old.counter_price; new.agreed_price:=null;
    elsif new.status='countered' then
      if u<>old.seller_id then raise exception 'Only seller may revise a counter-offer'; end if;
      if new.counter_price is null or new.counter_price<=0 then raise exception 'Counter price must be positive'; end if;
      new.agreed_price:=null;
    else
      raise exception 'Invalid counter-offer transition';
    end if;
  end if;

  new.last_action_by:=u;
  return new;
end $$;

drop trigger if exists trust_offer_guard on public.product_offers;
create trigger trust_offer_guard
before insert or update on public.product_offers
for each row execute function public.trust_offer_guard();

-- Offer transitions and Deal Room creation happen together. This prevents an
-- accepted offer from being stranded without its corresponding deal if a
-- second browser write fails.
create or replace function public.trust_offer_action(
  p_offer uuid,
  p_action text,
  p_counter_price numeric default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  u uuid:=auth.uid();
  o public.product_offers%rowtype;
  d public.deal_requests%rowtype;
  new_status text;
  price numeric;
begin
  if u is null then raise exception 'Authentication required'; end if;
  select * into o from public.product_offers where id=p_offer for update;
  if o.id is null or u not in(o.buyer_id,o.seller_id) then raise exception 'Offer access denied'; end if;

  if p_action='counter' then
    if u<>o.seller_id or o.status not in('pending','countered') then raise exception 'Only the seller may counter an active offer'; end if;
    if p_counter_price is null or p_counter_price<=0 then raise exception 'Counter price must be positive'; end if;
    update public.product_offers set status='countered',counter_price=p_counter_price,agreed_price=null,last_action_by=u,updated_at=now()
      where id=o.id returning * into o;
  elsif p_action='accept' then
    if o.status='pending' and u=o.seller_id then
      price:=o.offer_price;
    elsif o.status='countered' and u=o.buyer_id then
      price:=o.counter_price;
    else
      raise exception 'This offer cannot be accepted by the current user';
    end if;
    if price is null or price<=0 then raise exception 'Accepted price is invalid'; end if;
    update public.product_offers set status='accepted',agreed_price=price,last_action_by=u,updated_at=now()
      where id=o.id returning * into o;

    select * into d from public.deal_requests where source_offer_id=o.id order by created_at asc limit 1;
    if d.id is null then
      perform set_config('ecomatch.trust_deal','authorized',true);
      insert into public.deal_requests(deal_code,product_id,buyer_id,seller_id,status,agreed_price,source_offer_id)
      values(
        'ECO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
        o.product_id,o.buyer_id,o.seller_id,'accepted',price,o.id
      ) returning * into d;
    end if;
  elsif p_action='reject' then
    if o.status<>'pending' or u<>o.seller_id then raise exception 'Only the seller may reject a pending offer'; end if;
    update public.product_offers set status='rejected',last_action_by=u,updated_at=now() where id=o.id returning * into o;
  elsif p_action='cancel' then
    if u<>o.buyer_id or o.status not in('pending','countered') then raise exception 'Only the buyer may cancel or decline this offer'; end if;
    update public.product_offers set status='cancelled',last_action_by=u,updated_at=now() where id=o.id returning * into o;
  else
    raise exception 'Invalid offer action';
  end if;

  if o.status='accepted' and d.id is null then
    select * into d from public.deal_requests where source_offer_id=o.id order by created_at asc limit 1;
  end if;
  return jsonb_build_object(
    'offerId',o.id,
    'status',o.status,
    'agreedPrice',o.agreed_price,
    'counterPrice',o.counter_price,
    'dealId',d.id,
    'dealCode',d.deal_code
  );
end $$;

revoke all on function public.trust_offer_action(uuid,text,numeric) from public,anon;
grant execute on function public.trust_offer_action(uuid,text,numeric) to authenticated;
-- Direct browser updates can strand accepted offers without Deal Rooms. Keep
-- reads/inserts under RLS, but route all offer transitions through the RPC.
revoke update on public.product_offers from public,anon,authenticated;

create or replace function public.trust_snapshot_deal_requirements()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  p public.products%rowtype;
  buyer public.profiles%rowtype;
  seller public.profiles%rowtype;
  o public.product_offers%rowtype;
begin
  select * into p from public.products where id=new.product_id;
  if p.id is null or p.status<>'approved' then raise exception 'Listing is not available'; end if;
  if new.buyer_id=new.seller_id then raise exception 'Buyer and seller must be different users'; end if;
  if p.seller_id<>new.seller_id then raise exception 'Seller does not own this listing'; end if;
  if p.current_owner_id is not null and p.current_owner_id<>new.seller_id then raise exception 'Seller no longer owns this item'; end if;
  if auth.uid() is not null and auth.uid() not in(new.buyer_id,new.seller_id) and coalesce(auth.role(),'')<>'service_role' then raise exception 'Deal access denied'; end if;

  select * into buyer from public.profiles where id=new.buyer_id;
  select * into seller from public.profiles where id=new.seller_id;
  if buyer.id is null or seller.id is null then raise exception 'Buyer or seller profile is missing'; end if;

  if new.source_offer_id is not null then
    select * into o from public.product_offers where id=new.source_offer_id;
    if o.id is null or o.status<>'accepted' then raise exception 'Accepted offer not found'; end if;
    if o.product_id<>new.product_id or o.buyer_id<>new.buyer_id or o.seller_id<>new.seller_id then raise exception 'Offer does not belong to this deal'; end if;
    if o.agreed_price is null or o.agreed_price<=0 then raise exception 'Accepted offer price is invalid'; end if;
    new.agreed_price:=o.agreed_price;
    new.status:='accepted';
  else
    -- Direct deals start from the authoritative listing price; participants may
    -- negotiate using product_offers rather than mutating an accepted deal.
    new.agreed_price:=p.price;
  end if;

  new.buyer_identity_verification_required:=coalesce(new.buyer_identity_verification_required,false) or coalesce(p.require_verified_buyer,false);
  new.buyer_business_verification_required:=coalesce(new.buyer_business_verification_required,false) or coalesce(p.gst_verified_buyer_required,false);
  new.buyer_identity_verified_at_deal:=case when buyer.verification_status in('verified','verified_demo') then coalesce(buyer.verified_at,now()) end;
  new.seller_identity_verified_at_deal:=case when seller.verification_status in('verified','verified_demo') then coalesce(seller.verified_at,now()) end;
  new.buyer_gst_verified_at_deal:=case when buyer.business_verification_status='verified' then buyer.gst_verified_at end;
  new.seller_gst_verified_at_deal:=case when seller.business_verification_status='verified' then seller.gst_verified_at end;
  new.verification_requirement_locked:=true;
  return new;
end $$;

drop trigger if exists trust_snapshot_deal_requirements on public.deal_requests;
create trigger trust_snapshot_deal_requirements
before insert on public.deal_requests
for each row execute function public.trust_snapshot_deal_requirements();

-- Prevent two deal rooms from being created for the same accepted offer. If a
-- legacy database already contains duplicates, keep the migration non-destructive
-- and leave a clear audit warning instead of failing the whole release migration.
do $$
begin
  if not exists (
    select 1 from public.deal_requests
    where source_offer_id is not null
    group by source_offer_id having count(*) > 1
  ) then
    execute 'create unique index if not exists deal_requests_one_deal_per_offer on public.deal_requests(source_offer_id) where source_offer_id is not null';
  else
    raise warning 'Skipped deal_requests_one_deal_per_offer: legacy duplicate source_offer_id rows exist';
  end if;
end $$;

-- Deal amount and source offer are frozen at creation. Server-owned delivery
-- workflows may still change their own protected fields through the trusted flag.
create or replace function public.trust_price_freeze_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='service_role'
     or coalesce(current_setting('ecomatch.trust_deal',true),'')='authorized'
     or coalesce(current_setting('ecomatch.handover_rpc',true),'')='authorized' then return new; end if;
  if new.agreed_price is distinct from old.agreed_price or new.source_offer_id is distinct from old.source_offer_id then
    raise exception 'Deal price is locked; use the offer workflow for negotiated pricing';
  end if;
  return new;
end $$;

drop trigger if exists trust_price_freeze_guard on public.deal_requests;
create trigger trust_price_freeze_guard
before update on public.deal_requests
for each row execute function public.trust_price_freeze_guard();

-- Phase 12 re-granted direct INSERT on messages after an earlier safe-RPC phase.
-- Close that regression: SECURITY DEFINER send_safe_message remains the only
-- browser write path and performs participant + anti-circumvention checks.
revoke insert on public.messages from public,anon,authenticated;
revoke all on function public.send_safe_message(bigint,text,boolean,text) from public,anon;
grant execute on function public.send_safe_message(bigint,text,boolean,text) to authenticated;


-- Conversation identity is server-checked so a browser cannot pair an arbitrary
-- product with an unrelated seller or impersonate another buyer.
create or replace function public.trust_conversation_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare p public.products%rowtype; u uuid:=auth.uid();
begin
  if coalesce(auth.role(),'')='service_role' then return new; end if;
  if u is null then raise exception 'Authentication required'; end if;
  if tg_op='INSERT' then
    select * into p from public.products where id=new.product_id;
    if p.id is null or p.status<>'approved' then raise exception 'Listing is not available for chat'; end if;
    if new.seller_id<>p.seller_id then raise exception 'Conversation seller does not match listing'; end if;
    if new.buyer_id<>u or new.buyer_id=new.seller_id then raise exception 'Only the signed-in buyer may start this conversation'; end if;
    return new;
  end if;
  if new.product_id<>old.product_id or new.buyer_id<>old.buyer_id or new.seller_id<>old.seller_id then
    raise exception 'Conversation participants are immutable';
  end if;
  if u not in(old.buyer_id,old.seller_id) then raise exception 'Conversation access denied'; end if;
  return new;
end $$;

drop trigger if exists trust_conversation_guard on public.conversations;
create trigger trust_conversation_guard
before insert or update on public.conversations
for each row execute function public.trust_conversation_guard();


notify pgrst,'reload schema';
commit;
