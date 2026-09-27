-- Apply after phase18. Additive identity sessions and authorization repairs.
begin;
alter table profiles add column if not exists verification_method text,add column if not exists verified_at timestamptz,
 add column if not exists identity_reference_hash text,add column if not exists identity_name text,
 add column if not exists identity_liveness_passed boolean not null default false,
 add column if not exists identity_face_match_score numeric,
 add column if not exists identity_presence_status text;
-- Extend known legacy verification check without rewriting any profile rows.
alter table profiles drop constraint if exists profiles_verification_status_check;
alter table profiles add constraint profiles_verification_status_check check(verification_status in('unverified','pending','verified','verified_demo','rejected','banned')) not valid;
create table identity_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id),
 method text not null check(method in('uidai_offline_ekyc','demo_identity_liveness')),
 signature_valid boolean not null,proof_hash text,challenge text not null,
 expires_at timestamptz not null default(now()+interval '10 minutes'),consumed_at timestamptz,
 created_at timestamptz not null default now(),
 check((method='uidai_offline_ekyc' and signature_valid and length(proof_hash)=64) or (method='demo_identity_liveness' and not signature_valid and proof_hash is null))
);
alter table identity_sessions enable row level security;
revoke all on identity_sessions from public,anon,authenticated;
grant all on identity_sessions to service_role;
create index identity_sessions_expiry on identity_sessions(expires_at);
create or replace function trust_identity_profile_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if coalesce(auth.role(),'')='service_role' then return new;end if;
 if tg_op='INSERT' then
  if coalesce(new.verification_status,'unverified')<>'unverified' or new.verification_method is not null or new.verified_at is not null or new.identity_reference_hash is not null or new.identity_liveness_passed or new.identity_face_match_score is not null or new.identity_presence_status is not null then raise exception 'Identity verification is server managed';end if;
 elsif (to_jsonb(new)->'verification_status') is distinct from (to_jsonb(old)->'verification_status') or new.verification_method is distinct from old.verification_method or new.verified_at is distinct from old.verified_at or new.identity_reference_hash is distinct from old.identity_reference_hash or new.identity_name is distinct from old.identity_name or new.identity_liveness_passed is distinct from old.identity_liveness_passed or new.identity_face_match_score is distinct from old.identity_face_match_score or new.identity_presence_status is distinct from old.identity_presence_status then raise exception 'Identity verification is server managed';end if;
 return new;end $$;
create trigger trust_identity_profile_guard before insert or update on profiles for each row execute function trust_identity_profile_guard();
create or replace function trust_identity_complete(p_user uuid,p_session uuid,p_challenge text,p_presence text,p_demo_enabled boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare s identity_sessions%rowtype;v_status text;begin
 select * into s from identity_sessions where id=p_session and user_id=p_user for update;
 if s.id is null or s.expires_at<=now() or s.consumed_at is not null or s.challenge is distinct from p_challenge then raise exception 'Verification session expired or unavailable. Start again.';end if;
 if not trust_active(p_user) then raise exception 'Account restricted';end if;
 if p_presence is null or p_presence not in('camera_self_reported','native_face_detected_self_reported_challenge') then raise exception 'Camera presence confirmation required';end if;
 perform 1 from profiles where id=p_user for update;
 if s.method='demo_identity_liveness' then
  if p_demo_enabled is distinct from true then raise exception 'Demo identity verification is disabled';end if;
  if exists(select 1 from profiles where id=p_user and verification_status='verified') then raise exception 'Cannot replace genuine identity with demo';end if;
  v_status:='verified_demo';
 else
  if not s.signature_valid or s.proof_hash is null then raise exception 'Cryptographically verified UIDAI session required';end if;
  v_status:='verified';
 end if;
 update profiles set verification_status=v_status,verification_method=s.method,verified_at=now(),identity_reference_hash=s.proof_hash,
  identity_name=null,identity_liveness_passed=false,identity_face_match_score=null,identity_presence_status=p_presence where id=p_user;
 update identity_sessions set consumed_at=now() where id=s.id;
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(p_user,'identity',p_user::text,'identity_completed',jsonb_build_object('method',s.method,'status',v_status,'signatureValid',s.signature_valid,'presence',p_presence,'biometricVerified',false));
 return jsonb_build_object('status',v_status,'method',s.method,'presenceStatus',p_presence);end $$;
revoke all on function trust_identity_complete(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function trust_identity_complete(uuid,uuid,text,text,boolean) to service_role;
create or replace function trust_identity_reset_demo(p_user uuid) returns void language plpgsql security definer set search_path=public as $$begin
 perform 1 from profiles where id=p_user for update;
 if exists(select 1 from profiles where id=p_user and verification_status='verified') then raise exception 'Cannot reset real UIDAI verification in demo mode';end if;
 update profiles set verification_status='unverified',verification_method=null,verified_at=null,identity_reference_hash=null,identity_presence_status=null,identity_liveness_passed=false,identity_face_match_score=null where id=p_user and verification_method='demo_identity_liveness';
 delete from identity_sessions where user_id=p_user and method='demo_identity_liveness';
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action) values(p_user,'identity',p_user::text,'demo_reset');end $$;
revoke all on function trust_identity_reset_demo(uuid) from public,anon,authenticated;
grant execute on function trust_identity_reset_demo(uuid) to service_role;
-- Revoke old client-supplied proof RPC and caller-selected OTP setter.
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname in('complete_identity_verification','set_deal_exchange_code') loop
 execute format('revoke execute on function %s from public,anon,authenticated',f.signature);end loop;end $$;

-- Protect all handover evidence and completion fields, including on INSERT.
alter table deal_requests add column if not exists qr_verified_at timestamptz;
create or replace function trust_handover_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if coalesce(auth.role(),'')='service_role' or current_setting('ecomatch.handover_rpc',true)='authorized' then return new;end if;
 if tg_op='INSERT' then
  if new.qr_verified_at is not null or new.status<>'requested' or new.fulfilment_mode<>'self_pickup' or new.secure_state is not null or new.secure_version<>0 or new.secure_demo or new.exchange_code_hash is not null or new.exchange_code_verified_at is not null or new.buyer_handover_confirmed_at is not null or new.seller_handover_confirmed_at is not null or new.completed_at is not null then raise exception 'Handover is server managed';end if;
 elsif new.qr_verified_at is distinct from old.qr_verified_at or new.exchange_code_hash is distinct from old.exchange_code_hash or new.exchange_code_generated_at is distinct from old.exchange_code_generated_at or new.exchange_code_expires_at is distinct from old.exchange_code_expires_at or new.exchange_code_attempts is distinct from old.exchange_code_attempts or new.exchange_code_verified_at is distinct from old.exchange_code_verified_at or new.buyer_handover_confirmed_at is distinct from old.buyer_handover_confirmed_at or new.seller_handover_confirmed_at is distinct from old.seller_handover_confirmed_at or new.completed_at is distinct from old.completed_at or (new.status='completed' and old.status<>'completed') then raise exception 'Handover is server managed';end if;
 return new;end $$;
create trigger trust_handover_guard before insert or update on deal_requests for each row execute function trust_handover_guard();
create or replace function trust_self_pickup(p_deal uuid,p_action text,p_code text default null) returns text language plpgsql security definer set search_path=public,extensions as $$
declare d deal_requests%rowtype;u uuid:=auth.uid();code text;previous text;h text;old_role text:=auth.role();begin
 select * into d from deal_requests where id=p_deal for update;
 if d.id is null or u is null or u not in(d.buyer_id,d.seller_id) or not trust_active(u) or d.fulfilment_mode<>'self_pickup' or d.is_disputed then raise exception 'Self-pickup access denied';end if;
 if d.status='completed' and p_action='confirm' then return 'completed';end if;
 if d.status not in('accepted','meeting_planned','exchange_ready') then raise exception 'Deal is not ready for handover';end if;
 perform set_config('ecomatch.handover_rpc','authorized',true);
 if p_action='generate' then
  if u<>d.seller_id or d.exchange_code_verified_at is not null then raise exception 'Seller must generate before verification';end if;
  code:=lpad((100000+(get_byte(gen_random_bytes(1),0)*65536+get_byte(gen_random_bytes(1),0)*256+get_byte(gen_random_bytes(1),0))%900000)::text,6,'0');
  update deal_requests set exchange_code_hash=crypt(code,gen_salt('bf')),exchange_code_generated_at=now(),exchange_code_expires_at=now()+interval '10 minutes',exchange_code_attempts=0,buyer_handover_confirmed_at=null,seller_handover_confirmed_at=null where id=d.id;
 elsif p_action='verify' then
  if u<>d.buyer_id then raise exception 'Only buyer may verify';end if;
  if d.exchange_code_verified_at is not null or d.exchange_code_expires_at is null or d.exchange_code_expires_at<=now() or coalesce(d.exchange_code_attempts,0)>=5 or d.exchange_code_hash is null or p_code is null or p_code!~'^\d{6}$' then code:='false';
  else
   update deal_requests set exchange_code_attempts=coalesce(exchange_code_attempts,0)+1 where id=d.id;
   -- Existing SHA256 OTPs must be regenerated; no fallback to legacy instant completion.
   if left(d.exchange_code_hash,3)='$2a' and crypt(p_code,d.exchange_code_hash)=d.exchange_code_hash then
    update deal_requests set exchange_code_verified_at=now(),status='exchange_ready' where id=d.id;code:='true';else code:='false';end if;
  end if;
 elsif p_action='confirm' then
  if d.exchange_code_verified_at is null then raise exception 'Verify handover OTP first';end if;
  update deal_requests set buyer_handover_confirmed_at=case when u=buyer_id then coalesce(buyer_handover_confirmed_at,now()) else buyer_handover_confirmed_at end,seller_handover_confirmed_at=case when u=seller_id then coalesce(seller_handover_confirmed_at,now()) else seller_handover_confirmed_at end where id=d.id returning * into d;
  code:='waiting_for_other_party';
  if d.buyer_handover_confirmed_at is not null and d.seller_handover_confirmed_at is not null then
   perform 1 from products where id=d.product_id and status='approved' for update;if not found then raise exception 'Product is reserved or unavailable';end if;
   perform pg_advisory_xact_lock(180018);
   select event_hash into previous from ownership_events order by created_at desc,id desc limit 1;previous:=coalesce(previous,'GENESIS');
   h:=encode(digest(concat_ws('|',d.id,d.product_id,d.buyer_id,d.seller_id,previous,now()),'sha256'),'hex');
   perform set_config('request.jwt.claim.role','service_role',true);
   update products set status='sold',current_owner_id=d.buyer_id,sold_deal_id=d.id where id=d.product_id;
   update deal_requests set status='completed',completed_at=now(),updated_at=now() where id=d.id;
   insert into ownership_events(product_id,deal_id,deal_code,previous_owner_id,new_owner_id,previous_hash,event_hash) values(d.product_id,d.id,d.deal_code,d.seller_id,d.buyer_id,previous,h);
   perform set_config('request.jwt.claim.role',coalesce(old_role,''),true);code:='completed';
  end if;
 else raise exception 'Unknown handover action';end if;
 insert into deal_audit_logs(deal_id,actor_id,event_type,metadata) values(d.id,u,'self_pickup_'||p_action,jsonb_build_object('completed',code='completed'));
 perform set_config('ecomatch.handover_rpc','',true);return code;end $$;
revoke all on function trust_self_pickup(uuid,text,text) from public,anon;
grant execute on function trust_self_pickup(uuid,text,text) to authenticated;
create or replace function generate_deal_exchange_code(p_deal_id uuid) returns text language sql set search_path=public as $$select trust_self_pickup(p_deal_id,'generate');$$;
create or replace function verify_deal_exchange_code(p_deal_id uuid,p_code text) returns boolean language sql set search_path=public as $$select trust_self_pickup(p_deal_id,'verify',p_code)::boolean;$$;
create or replace function confirm_deal_handover(p_deal_id uuid) returns text language sql set search_path=public as $$select trust_self_pickup(p_deal_id,'confirm');$$;
revoke all on function generate_deal_exchange_code(uuid),verify_deal_exchange_code(uuid,text),confirm_deal_handover(uuid) from public,anon;
grant execute on function generate_deal_exchange_code(uuid),verify_deal_exchange_code(uuid,text),confirm_deal_handover(uuid) to authenticated;

-- Each successful assessment publication advances the version under the product lock.
create or replace function trust_publish_review(p_product bigint,p_version integer,p_review jsonb,p_hashes text[]) returns text language plpgsql security definer set search_path=public as $$
declare p products%rowtype;s text;v integer;begin
 select * into p from products where id=p_product for update;
 if p.id is null or p.moderation_version<>p_version or p.status not in('pending','pending_review','changes_requested') then raise exception 'Listing changed. Analyse it again';end if;
 select greatest(p_version,coalesce(max(version)+1,0)) into v from listing_ai_reviews where product_id=p.id;
 s:=case when (p_review->>'score')::integer>=80 and not (p_review->>'uncertain')::boolean and jsonb_array_length(p_review->'hardFlags')=0 and p_review->>'recommendation'='AUTO_APPROVE' then 'approved' else 'pending_review' end;
 insert into listing_ai_reviews(product_id,seller_id,version,score,risk_level,recommendation,hard_flags,checks,reasons,uncertain,source,image_hashes) values(p.id,p.seller_id,v,(p_review->>'score')::integer,p_review->>'riskLevel',p_review->>'recommendation',p_review->'hardFlags',p_review->'checks',p_review->'reasons',(p_review->>'uncertain')::boolean,p_review->>'source',p_hashes);
 update products set moderation_version=v+1,status=s,safety_score=(p_review->>'score')::integer,approval_method=case when s='approved' then 'ai_auto' else null end,approved_at=case when s='approved' then now() else null end where id=p.id;
 update product_images set verification_status=case when s='approved' then 'approved' else 'pending' end where product_id=p.id;
 insert into trust_audit_logs(entity_type,entity_id,action,details) values('listing',p.id::text,s,p_review);
 insert into deal_notifications(user_id,type,title,message,action_url) values(p.seller_id,'LISTING_REVIEW',case when s='approved' then 'Listing auto-approved' else 'Listing needs review' end,'Your safety assessment has been updated.','/seller/dashboard');return s;end $$;

alter table communication_risk_events add column attribution text check(attribution in('buyer','seller','unable_to_determine')),
 add column attributed_by uuid references profiles(id),add column attributed_at timestamptz,add column attribution_reason text;
create or replace function trust_attribute_call(p_actor uuid,p_event uuid,p_attribution text,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare r communication_risk_events%rowtype;c calls%rowtype;b uuid;s uuid;begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and account_status='active' and not coalesce(is_banned,false)) or length(trim(coalesce(p_reason,'')))<10 then raise exception 'Active admin and reason required';end if;
 if p_attribution is null or p_attribution not in('buyer','seller','unable_to_determine') then raise exception 'Choose buyer, seller or unable to determine';end if;
 select * into r from communication_risk_events where id=p_event for update;
 select * into c from calls where id=r.call_id;
 if c.id is null then raise exception 'Call evidence unavailable';end if;
 if r.action_taken in('block','BLOCK_AND_REVIEW') then raise exception 'Restore the previously restricted account before changing attribution';end if;
 if c.deal_id is not null then select buyer_id,seller_id into b,s from deal_requests where id=c.deal_id;
 else select seller_id into s from products where id=c.product_id;b:=case when c.caller_id=s then c.receiver_id else c.caller_id end;end if;
 if p_attribution<>'unable_to_determine' and (b is null or s is null or s not in(c.caller_id,c.receiver_id) or b not in(c.caller_id,c.receiver_id)) then raise exception 'Unable to resolve call participant roles';end if;
 update communication_risk_events set reported_user_id=case p_attribution when 'buyer' then b when 'seller' then s else null end,attribution=p_attribution,attributed_by=p_actor,attributed_at=now(),attribution_reason=p_reason where id=r.id;
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(p_actor,'call_safety',r.id::text,'attribution_reviewed',jsonb_build_object('attribution',p_attribution,'reason',p_reason,'callId',c.id));
end $$;
revoke all on function trust_attribute_call(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function trust_attribute_call(uuid,uuid,text,text) to service_role;
-- Retain the existing QR interface, but require a real server-issued token and both confirmations.
create table if not exists deal_qr_tokens(id uuid primary key default gen_random_uuid(),deal_id uuid not null references deal_requests(id),token_hash text not null unique,expires_at timestamptz not null,used_at timestamptz,created_at timestamptz default now());
alter table deal_qr_tokens enable row level security;
revoke insert,update,delete on deal_qr_tokens from anon,authenticated;
create or replace function generate_secure_handover_qr(p_deal_id uuid) returns text language plpgsql security definer set search_path=public,extensions as $$
declare d deal_requests%rowtype;t text;begin
 select * into d from deal_requests where id=p_deal_id for update;
 if auth.uid() is null or auth.uid()<>d.seller_id or not trust_active(auth.uid()) or d.fulfilment_mode<>'self_pickup' or d.is_disputed or d.status not in('accepted','meeting_planned','exchange_ready') or d.exchange_code_verified_at is not null then raise exception 'Seller must generate a pending self-pickup QR';end if;
 t:=encode(gen_random_bytes(32),'hex');update deal_qr_tokens set used_at=now() where deal_id=d.id and used_at is null;
 insert into deal_qr_tokens(deal_id,token_hash,expires_at) values(d.id,encode(digest(t,'sha256'),'hex'),now()+interval '5 minutes');return t;end $$;
create or replace function verify_secure_handover_qr(p_deal_id uuid,p_raw_token text) returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare d deal_requests%rowtype;t deal_qr_tokens%rowtype;begin
 select * into d from deal_requests where id=p_deal_id for update;
 if auth.uid() is null or auth.uid()<>d.buyer_id or not trust_active(auth.uid()) or d.fulfilment_mode<>'self_pickup' or d.is_disputed or d.status not in('accepted','meeting_planned','exchange_ready') then raise exception 'Buyer must verify a pending self-pickup QR';end if;
 if p_raw_token is null or length(p_raw_token)<>64 or d.exchange_code_verified_at is not null then return false;end if;
 select * into t from deal_qr_tokens where deal_id=d.id and token_hash=encode(digest(p_raw_token,'sha256'),'hex') for update;
 if t.id is null or t.used_at is not null or t.expires_at<=now() then return false;end if;
 update deal_qr_tokens set used_at=now() where id=t.id;
 perform set_config('ecomatch.handover_rpc','authorized',true);
 update deal_requests set qr_verified_at=now(),exchange_code_verified_at=now(),status='exchange_ready' where id=d.id;
 perform set_config('ecomatch.handover_rpc','',true);
 insert into deal_audit_logs(deal_id,actor_id,event_type) values(d.id,auth.uid(),'self_pickup_qr_verified');return true;end $$;
revoke all on function generate_secure_handover_qr(uuid),verify_secure_handover_qr(uuid,text) from public,anon;
grant execute on function generate_secure_handover_qr(uuid),verify_secure_handover_qr(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
