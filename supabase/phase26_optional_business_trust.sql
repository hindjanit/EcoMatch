-- Phase 26: optional identity and manual GST trust. Additive; apply after phase 24.
begin;

alter table public.profiles
  add column if not exists account_type text not null default 'individual',
  add column if not exists business_name text,
  add column if not exists trade_name text,
  add column if not exists gstin text,
  add column if not exists business_verification_status text not null default 'unverified',
  add column if not exists gst_verified_at timestamptz,
  add column if not exists gst_verification_method text,
  add column if not exists business_verification_reference text;

alter table public.products
  add column if not exists prefer_verified_buyers boolean not null default false,
  add column if not exists require_verified_buyer boolean not null default false,
  add column if not exists b2b_only boolean not null default false,
  add column if not exists gst_verified_buyer_required boolean not null default false;

alter table public.deal_requests
  add column if not exists buyer_identity_verification_required boolean not null default false,
  add column if not exists seller_identity_verification_required boolean not null default false,
  add column if not exists buyer_business_verification_required boolean not null default false,
  add column if not exists seller_business_verification_required boolean not null default false,
  add column if not exists buyer_identity_verified_at_deal timestamptz,
  add column if not exists seller_identity_verified_at_deal timestamptz,
  add column if not exists buyer_gst_verified_at_deal timestamptz,
  add column if not exists seller_gst_verified_at_deal timestamptz,
  add column if not exists verification_requested_by uuid references auth.users(id),
  add column if not exists verification_requested_at timestamptz,
  add column if not exists business_verification_requested_by uuid references auth.users(id),
  add column if not exists business_verification_requested_at timestamptz,
  add column if not exists verification_requirement_locked boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_type_check') then
    alter table public.profiles add constraint profiles_account_type_check check (account_type in ('individual','business'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_business_verification_status_check') then
    alter table public.profiles add constraint profiles_business_verification_status_check check (business_verification_status in ('unverified','pending','verified','failed','manual_review'));
  end if;
end $$;

-- One atomic, idempotent completion endpoint. Confirmation timestamps are set
-- only for auth.uid(); the second party call performs the transfer.
create or replace function public.complete_secure_handover(p_deal uuid) returns text language plpgsql security definer set search_path=public,extensions as $$
declare d public.deal_requests%rowtype; p public.products%rowtype; b public.profiles%rowtype; s public.profiles%rowtype; u uuid:=auth.uid(); previous text; h text;
begin
 select * into d from public.deal_requests where id=p_deal for update;
 if d.id is null or u is null or u not in(d.buyer_id,d.seller_id) or d.buyer_id=d.seller_id then raise exception 'Handover access denied'; end if;
 if d.status='completed' and exists(select 1 from public.ownership_events where deal_id=d.id) then return 'completed'; end if;
 if d.status not in('accepted','meeting_planned','exchange_ready','handover_started','buyer_confirmed','seller_confirmed') or coalesce(d.is_disputed,false) then raise exception 'Deal cannot be completed'; end if;
 if d.exchange_code_verified_at is null or d.exchange_code_verified_at < now()-interval '15 minutes' or not coalesce(d.proximity_verified,false) then raise exception 'A recent server-verified OTP or QR handover is required'; end if;
 select * into b from public.profiles where id=d.buyer_id; select * into s from public.profiles where id=d.seller_id;
 if (d.buyer_identity_verification_required and b.verification_status not in('verified','verified_demo')) or (d.seller_identity_verification_required and s.verification_status not in('verified','verified_demo')) then raise exception 'Required identity verification is incomplete'; end if;
 if (d.buyer_business_verification_required and b.business_verification_status<>'verified') or (d.seller_business_verification_required and s.business_verification_status<>'verified') then raise exception 'Required GST business verification is incomplete'; end if;
 update public.deal_requests set buyer_handover_confirmed_at=case when u=buyer_id then coalesce(buyer_handover_confirmed_at,now()) else buyer_handover_confirmed_at end, seller_handover_confirmed_at=case when u=seller_id then coalesce(seller_handover_confirmed_at,now()) else seller_handover_confirmed_at end where id=d.id returning * into d;
 if d.buyer_handover_confirmed_at is null or d.seller_handover_confirmed_at is null then return 'waiting_for_other_party'; end if;
 select * into p from public.products where id=d.product_id for update;
 if p.id is null or p.seller_id<>d.seller_id or p.status<>'approved' or(p.current_owner_id is not null and p.current_owner_id<>d.seller_id) then raise exception 'Seller no longer owns this available product'; end if;
 perform pg_advisory_xact_lock(hashtext('ecomatch-transfer:'||d.product_id::text));
 if exists(select 1 from public.ownership_events where deal_id=d.id) then update public.deal_requests set status='completed',completed_at=coalesce(completed_at,now()) where id=d.id; return 'completed'; end if;
 perform set_config('ecomatch.handover_rpc','authorized',true); select event_hash into previous from public.ownership_events order by created_at desc,id desc limit 1; previous:=coalesce(previous,'GENESIS'); h:=encode(digest(concat_ws('|',d.id,d.product_id,d.buyer_id,d.seller_id,previous,now()),'sha256'),'hex');
 update public.products set status='sold',current_owner_id=d.buyer_id,sold_deal_id=d.id where id=d.product_id;
 update public.deal_requests set status='completed',completed_at=now(),updated_at=now(),exchange_code_hash=null where id=d.id;
 insert into public.ownership_events(product_id,deal_id,deal_code,previous_owner_id,new_owner_id,previous_hash,event_hash) values(d.product_id,d.id,d.deal_code,d.seller_id,d.buyer_id,previous,h);
 insert into public.deal_audit_logs(deal_id,actor_id,event_type,metadata) values(d.id,u,'secure_handover_completed',jsonb_build_object('verification_method',case when d.qr_verified_at is not null then 'qr' else 'otp' end));
 return 'completed';
end $$;
create unique index if not exists profiles_gstin_unique_when_present on public.profiles(gstin) where gstin is not null;
create index if not exists deal_requests_trust_requirements_idx on public.deal_requests(seller_identity_verification_required, seller_business_verification_required);
create unique index if not exists ownership_events_one_transfer_per_deal on public.ownership_events(deal_id);

create or replace function public.trust_submit_business_verification(p_business_name text, p_trade_name text, p_gstin text)
returns void language plpgsql security definer set search_path=public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Authentication required'; end if;
  perform set_config('ecomatch.trust_admin','authorized',true);
  if p_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then raise exception 'Invalid GSTIN format'; end if;
  update public.profiles set account_type='business', business_name=p_business_name, trade_name=p_trade_name,
    gstin=p_gstin, business_verification_status='pending', gst_verified_at=null,
    gst_verification_method='manual_official_lookup', business_verification_reference=null where id=u;
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details)
    values(u,'business_verification',u::text,'gst_verification_submitted',jsonb_build_object('gstin_last4',right(p_gstin,4)));
end $$;

create or replace function public.trust_admin_business_review(p_user uuid,p_action text,p_legal_name text default null,p_trade_name text default null)
returns void language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); status_value text;
begin
  if not exists(select 1 from public.profiles where id=u and role='admin') then raise exception 'Admin access required'; end if;
  perform set_config('ecomatch.trust_admin','authorized',true);
  status_value := case p_action when 'verify' then 'verified' when 'reject' then 'failed' when 'review' then 'manual_review' else null end;
  if status_value is null then raise exception 'Invalid business review action'; end if;
  update public.profiles set business_verification_status=status_value, gst_verified_at=case when status_value='verified' then now() else null end,
    gst_verification_method=case when status_value='verified' then 'manual_official_lookup' else gst_verification_method end,
    business_name=coalesce(p_legal_name,business_name), trade_name=coalesce(p_trade_name,trade_name) where id=p_user;
  insert into public.trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(u,'business_verification',p_user::text,'gst_verification_' || case status_value when 'verified' then 'verified' when 'failed' then 'rejected' else 'started' end,jsonb_build_object('user_id',p_user));
end $$;

-- Deal requirements are frozen at creation. Profile preference changes cannot loosen them.
create or replace function public.trust_snapshot_deal_requirements() returns trigger language plpgsql security definer set search_path=public as $$
declare p public.products%rowtype; buyer public.profiles%rowtype; seller public.profiles%rowtype;
begin
  select * into p from public.products where id=new.product_id;
  select * into buyer from public.profiles where id=new.buyer_id;
  select * into seller from public.profiles where id=new.seller_id;
  if new.buyer_id = new.seller_id then raise exception 'Buyer and seller must be different users'; end if;
  new.buyer_identity_verification_required := coalesce(new.buyer_identity_verification_required,false) or coalesce(p.require_verified_buyer,false);
  new.buyer_business_verification_required := coalesce(new.buyer_business_verification_required,false) or coalesce(p.gst_verified_buyer_required,false);
  new.buyer_identity_verified_at_deal := case when buyer.verification_status in ('verified','verified_demo') then coalesce(buyer.verified_at,now()) end;
  new.seller_identity_verified_at_deal := case when seller.verification_status in ('verified','verified_demo') then coalesce(seller.verified_at,now()) end;
  new.buyer_gst_verified_at_deal := case when buyer.business_verification_status='verified' then buyer.gst_verified_at end;
  new.seller_gst_verified_at_deal := case when seller.business_verification_status='verified' then seller.gst_verified_at end;
  new.verification_requirement_locked := true; return new;
end $$;
drop trigger if exists trust_snapshot_deal_requirements on public.deal_requests;
create trigger trust_snapshot_deal_requirements before insert on public.deal_requests for each row execute function public.trust_snapshot_deal_requirements();

-- Sensitive profile verification results cannot be set through the browser's RLS update policy.
create or replace function public.trust_block_client_verification_update() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('ecomatch.trust_admin',true),'') <> 'authorized' and
    (new.business_verification_status is distinct from old.business_verification_status or new.gst_verified_at is distinct from old.gst_verified_at or new.gst_verification_method is distinct from old.gst_verification_method or new.business_verification_reference is distinct from old.business_verification_reference) then
    raise exception 'Verification results are server managed';
  end if; return new;
end $$;
drop trigger if exists trust_block_client_verification_update on public.profiles;
create trigger trust_block_client_verification_update before update on public.profiles for each row execute function public.trust_block_client_verification_update();

-- Replace phase-24's unconditional identity gate. Requirements are those frozen
-- on the deal row, not today's profile/listing preferences.
create or replace function public.trust_self_pickup_readiness(p_deal uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.deal_requests%rowtype; p public.products%rowtype; b public.profiles%rowtype; s public.profiles%rowtype; disclosure integer; completed boolean;
begin
 select * into d from public.deal_requests where id=p_deal;
 if d.id is null or auth.uid() is null or auth.uid() not in(d.buyer_id,d.seller_id) then raise exception 'Deal access denied'; end if;
 select * into p from public.products where id=d.product_id; select * into b from public.profiles where id=d.buyer_id; select * into s from public.profiles where id=d.seller_id;
 select disclosure_version into disclosure from public.product_condition_disclosures where product_id=d.product_id;
 completed:=d.status='completed' and exists(select 1 from public.ownership_events where deal_id=d.id);
 return jsonb_build_object('completed',completed,'ready',not completed and d.fulfilment_mode='self_pickup' and d.status='exchange_ready' and not coalesce(d.is_disputed,false) and d.exchange_code_verified_at is not null and coalesce(d.proximity_verified,false) and d.buyer_handover_confirmed_at is not null and d.seller_handover_confirmed_at is not null and (not d.buyer_identity_verification_required or b.verification_status in('verified','verified_demo')) and (not d.seller_identity_verification_required or s.verification_status in('verified','verified_demo')) and (not d.buyer_business_verification_required or b.business_verification_status='verified') and (not d.seller_business_verification_required or s.business_verification_status='verified') and (disclosure is null or(d.buyer_disclosure_confirmation='matches' and d.disclosure_version_confirmed=disclosure)) and p.id is not null and p.status='approved' and p.seller_id=d.seller_id and(p.current_owner_id is null or p.current_owner_id=d.seller_id),'requirements',jsonb_build_object('selfPickup',d.fulfilment_mode='self_pickup','meetingReady',d.status='exchange_ready','identity',((not d.buyer_identity_verification_required or b.verification_status in('verified','verified_demo')) and(not d.seller_identity_verification_required or s.verification_status in('verified','verified_demo'))),'business',((not d.buyer_business_verification_required or b.business_verification_status='verified') and(not d.seller_business_verification_required or s.business_verification_status='verified')),'verification',d.exchange_code_verified_at is not null,'verificationMethod',case when d.qr_verified_at is not null then 'qr' when d.exchange_code_verified_at is not null then 'otp' else null end,'proximity',coalesce(d.proximity_verified,false),'buyerConfirmation',d.buyer_handover_confirmed_at is not null,'sellerConfirmation',d.seller_handover_confirmed_at is not null,'noDispute',not coalesce(d.is_disputed,false),'sellerOwnsProduct',p.id is not null and p.status='approved' and p.seller_id=d.seller_id and(p.current_owner_id is null or p.current_owner_id=d.seller_id)));
end $$;

revoke all on function public.trust_submit_business_verification(text,text,text) from public,anon;
grant execute on function public.trust_submit_business_verification(text,text,text) to authenticated;
revoke all on function public.trust_admin_business_review(uuid,text,text,text) from public,anon;
grant execute on function public.trust_admin_business_review(uuid,text,text,text) to authenticated;
revoke all on function public.complete_secure_handover(uuid) from public,anon;
grant execute on function public.complete_secure_handover(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
