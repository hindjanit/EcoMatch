-- Additive upgrade. Requires the existing EcoMatch tables through phase 17.
-- Apply in staging first. No legacy rows are completed, paid or auto-approved here.
begin;
create extension if not exists pgcrypto;
do $$ begin
  if to_regclass('public.deal_requests') is null or to_regclass('public.calls') is null or to_regclass('public.ownership_events') is null then
    raise exception 'Apply existing EcoMatch schema through phase 17 first';
  end if;
end $$;

alter table public.profiles add column if not exists account_status text not null default 'active' check(account_status in ('active','safety_hold','safety_blocked'));
alter table public.products add column if not exists safety_score integer check(safety_score between 0 and 100),
 add column if not exists approval_method text check(approval_method in ('ai_auto','admin')),
 add column if not exists approved_at timestamptz,
 add column if not exists moderation_version integer not null default 0;
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check(status in ('pending','pending_review','changes_requested','approved','rejected','sold','reserved'));
alter table public.calls add column if not exists recording_consent jsonb not null default '{}',
 add column if not exists recording_storage_path text,
 add column if not exists transcription_status text not null default 'PENDING',
 add column if not exists retention_until timestamptz default (now()+interval '30 days');
alter table public.deal_requests add column if not exists fulfilment_mode text not null default 'self_pickup' check(fulfilment_mode in ('self_pickup','secure_delivery')),
 add column if not exists secure_state text,
 add column if not exists secure_version integer not null default 0,
 add column if not exists secure_demo boolean not null default false;
alter table public.ownership_events add column if not exists evidence_hash text;

create or replace function public.trust_is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='admin' and not coalesce(is_banned,false) and account_status='active'); $$;
create or replace function public.trust_participant(p_deal uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from deal_requests where id=p_deal and auth.uid() in (buyer_id,seller_id)) or trust_is_admin(); $$;
create or replace function public.trust_active(p_user uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=p_user and account_status='active' and not coalesce(is_banned,false)); $$;

create table if not exists public.listing_ai_reviews (
 id uuid primary key default gen_random_uuid(), product_id bigint not null references products(id), seller_id uuid not null references profiles(id),
 version integer not null, score integer not null check(score between 0 and 100), risk_level text not null,
 recommendation text not null, hard_flags jsonb not null default '[]', checks jsonb not null, reasons jsonb not null,
 uncertain boolean not null, source text not null, image_hashes text[] not null default '{}', created_at timestamptz not null default now(),unique(product_id,version)
);
create table if not exists public.trust_audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references profiles(id), entity_type text not null,entity_id text not null,
 action text not null,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create table if not exists public.delivery_quotes (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null references deal_requests(id),provider text not null,provider_quote_id text not null,
 product_paise bigint not null check(product_paise>=0),delivery_paise bigint not null check(delivery_paise>=0),service_paise bigint not null check(service_paise>=0),
 total_paise bigint not null check(total_paise=product_paise+delivery_paise+service_paise),deposit_paise bigint not null check(deposit_paise>=0),
 markup_percent numeric not null,distance_km numeric not null,expires_at timestamptz not null,is_demo boolean not null,created_at timestamptz not null default now()
);
create table if not exists public.deliveries (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null unique references deal_requests(id),quote_id uuid references delivery_quotes(id),
 pickup jsonb,dropoff jsonb,pickup_confirmed_at timestamptz,dropoff_confirmed_at timestamptz,
 provider text,provider_booking_id text unique,tracking_url text,provider_status text,
 pickup_verified_at timestamptz,delivery_verified_at timestamptz,buyer_confirmed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null references deal_requests(id),payer_id uuid not null references profiles(id),
 kind text not null check(kind in ('buyer','deposit')),provider text not null,provider_order_id text not null unique,
 amount_paise bigint not null check(amount_paise>=0),currency text not null default 'INR' check(currency='INR'),
 status text not null check(status in ('CREATED','PENDING','PAID','HELD','RELEASE_PENDING','RELEASED','REFUND_PENDING','REFUNDED','FAILED','DISPUTED')),
 is_demo boolean not null,operation_reference text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(deal_id,kind)
);
create table if not exists public.seller_security_deposits (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null unique references deal_requests(id),payment_id uuid references payments(id),
 seller_id uuid not null references profiles(id),amount_paise bigint not null check(amount_paise>=0),deducted_paise bigint not null default 0 check(deducted_paise>=0 and deducted_paise<=amount_paise),
 status text not null check(status in ('PENDING','PAID','HELD','PARTIALLY_DEDUCTED','REFUNDED','FORFEITED_AFTER_REVIEW')),review_reason text,created_at timestamptz not null default now()
);
-- One private evidence table distinguishes pickup/delivery/dispute/return explicitly.
create table if not exists public.exchange_evidence (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null references deal_requests(id),product_id bigint not null references products(id),
 uploaded_by uuid not null references profiles(id),stage text not null check(stage in ('pickup','delivery','dispute','return')),
 photos jsonb not null,video_path text,evidence_hash text not null,captured_at timestamptz not null default now(),
 location jsonb,ai_result jsonb,review_status text not null default 'PENDING' check(review_status in ('PENDING','VERIFIED','REVIEW_REQUIRED','REJECTED')),
 retention_until timestamptz not null default(now()+interval '90 days'),created_at timestamptz not null default now()
);
create table if not exists public.delivery_tokens (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null references deal_requests(id),purpose text not null check(purpose in ('pickup','delivery')),
 token_hash text not null unique,otp_hash text not null,expires_at timestamptz not null,used_at timestamptz,revoked_at timestamptz,attempts integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.delivery_returns (
 id uuid primary key default gen_random_uuid(),deal_id uuid not null unique references deal_requests(id),dispute_id uuid references deal_disputes(id),
 state text not null,reason text not null,buyer_refund_paise bigint check(buyer_refund_paise>=0),deposit_deduction_paise bigint check(deposit_deduction_paise>=0),
 reviewed_by uuid references profiles(id),reviewed_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.call_transcripts (
 id uuid primary key default gen_random_uuid(),call_id uuid not null references calls(id),speaker_user_id uuid references profiles(id),
 text text not null,start_time numeric not null,end_time numeric not null,confidence numeric not null check(confidence between 0 and 1),
 attribution_verified boolean not null default false,created_at timestamptz not null default now()
);
create table if not exists public.call_recordings (
 id uuid primary key default gen_random_uuid(),call_id uuid not null references calls(id),uploaded_by uuid not null references profiles(id),
 storage_path text not null unique,sha256 text not null,status text not null default 'PENDING',error text,
 retention_until timestamptz not null default(now()+interval '30 days'),created_at timestamptz not null default now(),unique(call_id,uploaded_by)
);
-- Existing communication_risk_events are reused instead of a disconnected safety table.
alter table public.communication_risk_events add column if not exists analysis jsonb,add column if not exists action_taken text;
create table if not exists public.trust_idempotency (
 scope text not null,key text not null,request_hash text not null,result jsonb,created_at timestamptz not null default now(),primary key(scope,key)
);
create table if not exists public.trust_rate_limits(key text primary key,hits integer not null,expires_at timestamptz not null);
create or replace function public.trust_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
 declare n integer; begin
 insert into trust_rate_limits values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set
 hits=case when trust_rate_limits.expires_at<now() then 1 else trust_rate_limits.hits+1 end,
 expires_at=case when trust_rate_limits.expires_at<now() then excluded.expires_at else trust_rate_limits.expires_at end returning hits into n;
 return n<=p_limit; end $$;
revoke all on function public.trust_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.trust_rate_limit(text,integer,integer) to service_role;

do $$ declare t text; begin
 foreach t in array array['listing_ai_reviews','trust_audit_logs','delivery_quotes','deliveries','payments','seller_security_deposits','exchange_evidence','delivery_tokens','delivery_returns','call_transcripts','call_recordings','trust_idempotency','trust_rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke insert,update,delete on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['delivery_quotes','deliveries','payments','seller_security_deposits','exchange_evidence','delivery_returns'] loop
 execute format('drop policy if exists trust_read on public.%I',t);
 execute format('create policy trust_read on public.%I for select to authenticated using (public.trust_participant(deal_id))',t);
 end loop;
end $$;
create policy trust_listing_read on listing_ai_reviews for select to authenticated using(seller_id=auth.uid() or trust_is_admin());
create policy trust_audit_read on trust_audit_logs for select to authenticated using(trust_is_admin());
create policy trust_transcript_read on call_transcripts for select to authenticated using(trust_is_admin() or exists(select 1 from calls c where c.id=call_id and auth.uid() in(c.caller_id,c.receiver_id)));
create policy trust_recording_read on call_recordings for select to authenticated using(trust_is_admin() or exists(select 1 from calls c where c.id=call_id and auth.uid() in(c.caller_id,c.receiver_id)));
create policy trust_admin_calls on calls for select to authenticated using(trust_is_admin());
create policy trust_admin_risks on communication_risk_events for select to authenticated using(trust_is_admin());
create policy trust_admin_deal on deal_requests for select to authenticated using(trust_is_admin());
create policy trust_admin_disputes on deal_disputes for select to authenticated using(trust_is_admin());
create policy trust_admin_timeline on deal_audit_logs for select to authenticated using(trust_is_admin());

create index if not exists trust_listing_score on products(status,safety_score);
create index if not exists trust_reviews_seller on listing_ai_reviews(seller_id,created_at desc);
create index if not exists trust_delivery_state on deal_requests(secure_state) where fulfilment_mode='secure_delivery';
create index if not exists trust_evidence_deal on exchange_evidence(deal_id,stage,created_at desc);
create index if not exists trust_payment_deal on payments(deal_id,status);
create index if not exists trust_transcripts_call on call_transcripts(call_id,start_time);
create index if not exists trust_audit_entity on trust_audit_logs(entity_type,entity_id,created_at);

-- Recordings and delivery proof are private. Remove permissive legacy storage rules.
update storage.buckets set public=false where id='deal_recordings';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('exchange-evidence','exchange-evidence',false,15000000,array['image/jpeg','image/png','image/webp','video/webm','video/mp4']),
 ('call-recordings-private','call-recordings-private',false,15000000,array['audio/webm','audio/ogg','audio/mp4']) on conflict(id) do update set public=false;
drop policy if exists "Public and authenticated can upload deal recordings" on storage.objects;
drop policy if exists "Public and authenticated can read deal recordings" on storage.objects;
create policy trust_private_storage_guard on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id not in('deal_recordings','exchange-evidence','call-recordings-private'))
 with check(bucket_id not in('deal_recordings','exchange-evidence','call-recordings-private'));
-- Signed URLs are created by the authorized server only, and never stored as public URLs.

create or replace function public.trust_profile_guard() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if coalesce(auth.role(),'')='service_role' or trust_is_admin() then return new; end if;
 if tg_op='INSERT' then
   if new.role='admin' or new.account_status<>'active' or coalesce(new.is_banned,false) then raise exception 'Protected profile fields';end if;
 elsif new.role is distinct from old.role or new.account_status is distinct from old.account_status or new.is_banned is distinct from old.is_banned then raise exception 'Protected profile fields'; end if;
 return new;end $$;
drop trigger if exists trust_profile_guard on profiles;
create trigger trust_profile_guard before insert or update on profiles for each row execute function trust_profile_guard();

create or replace function public.trust_listing_guard() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if coalesce(auth.role(),'')='service_role' then return new;end if;
 if not trust_active(new.seller_id) then raise exception 'Account restricted';end if;
 if trust_is_admin() then
   if new.status='approved' and (tg_op='INSERT' or old.status is distinct from new.status) then new.approval_method:='admin';new.approved_at:=now();end if;
   return new;
 end if;
 if tg_op='INSERT' then
   new.status:='pending_review';new.safety_score:=null;new.approval_method:=null;new.approved_at:=null;new.moderation_version:=0;
 else
   if new.seller_id<>old.seller_id or new.current_owner_id is distinct from old.current_owner_id or new.sold_deal_id is distinct from old.sold_deal_id then raise exception 'Ownership is server managed';end if;
   if new.safety_score is distinct from old.safety_score or new.approval_method is distinct from old.approval_method or new.approved_at is distinct from old.approved_at or new.status is distinct from old.status then raise exception 'Moderation is server managed';end if;
   if (to_jsonb(new)-array['updated_at','moderation_version']) is distinct from (to_jsonb(old)-array['updated_at','moderation_version']) then
     new.status:='pending_review';new.safety_score:=null;new.approval_method:=null;new.approved_at:=null;new.moderation_version:=old.moderation_version+1;
   end if;
 end if;return new;end $$;
drop trigger if exists trust_listing_guard on products;
create trigger trust_listing_guard before insert or update on products for each row execute function trust_listing_guard();

create or replace function public.trust_account_write_guard() returns trigger language plpgsql security definer set search_path=public as $$
 declare u uuid; begin
 u:=(to_jsonb(new)->>case tg_table_name when 'calls' then 'caller_id' when 'messages' then 'sender_id' else 'buyer_id' end)::uuid;
 if not trust_active(u) then raise exception 'Account restricted pending safety review';end if;return new;end $$;
do $$ declare t text;begin foreach t in array array['calls','messages','conversations','deal_requests'] loop
 execute format('drop trigger if exists trust_account_write_guard on public.%I',t);
 execute format('create trigger trust_account_write_guard before insert on public.%I for each row execute function trust_account_write_guard()',t);
end loop;end $$;

create or replace function public.trust_deal_guard() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if coalesce(auth.role(),'')='service_role' then return new;end if;
 if new.buyer_id<>old.buyer_id or new.seller_id<>old.seller_id or new.product_id<>old.product_id then raise exception 'Deal participants are immutable';end if;
 if new.secure_state is distinct from old.secure_state or new.fulfilment_mode is distinct from old.fulfilment_mode or new.secure_version<>old.secure_version or new.secure_demo<>old.secure_demo then raise exception 'Use the server delivery workflow';end if;
 if old.fulfilment_mode='secure_delivery' and new is distinct from old then raise exception 'Secure delivery requires server transitions';end if;
 if new.status='completed' and old.status<>'completed' and (new.exchange_code_verified_at is null or new.buyer_handover_confirmed_at is null or new.seller_handover_confirmed_at is null) then raise exception 'Verified handover and both confirmations required';end if;
 return new;end $$;
drop trigger if exists trust_deal_guard on deal_requests;
create trigger trust_deal_guard before update on deal_requests for each row execute function trust_deal_guard();

create or replace function public.trust_call_guard() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if coalesce(auth.role(),'')='service_role' then return new;end if;
 if new.caller_id<>old.caller_id or new.receiver_id<>old.receiver_id or new.deal_id is distinct from old.deal_id or new.product_id is distinct from old.product_id
 or new.recording_consent<>old.recording_consent or new.recording_storage_path is distinct from old.recording_storage_path or new.transcript is distinct from old.transcript
 or new.risk_score<>old.risk_score or new.is_diverted is distinct from old.is_diverted then raise exception 'Protected call fields';end if;
 return new;end $$;
drop trigger if exists trust_call_guard on calls;
create trigger trust_call_guard before update on calls for each row execute function trust_call_guard();

-- Replaces the unsafe phase-14 one-party instant completion while retaining the URL/RPC.
create or replace function public.confirm_deal_handover(p_deal_id uuid) returns text language plpgsql security definer set search_path=public,extensions as $$
 declare d deal_requests%rowtype; prev text; h text; begin
 select * into d from deal_requests where id=p_deal_id for update;
 if auth.uid() is null or auth.uid() not in(d.buyer_id,d.seller_id) then raise exception 'Participant access required';end if;
 if d.fulfilment_mode<>'self_pickup' then raise exception 'Use Secure Delivery confirmation';end if;
 if d.status='completed' then return 'completed';end if;
 if d.status<>'exchange_ready' or d.exchange_code_verified_at is null or d.is_disputed then raise exception 'Verify handover OTP first';end if;
 update deal_requests set buyer_handover_confirmed_at=case when auth.uid()=buyer_id then now() else buyer_handover_confirmed_at end,
 seller_handover_confirmed_at=case when auth.uid()=seller_id then now() else seller_handover_confirmed_at end where id=d.id returning * into d;
 if d.buyer_handover_confirmed_at is null or d.seller_handover_confirmed_at is null then return 'waiting_for_other_party';end if;
 perform pg_advisory_xact_lock(180018);
 select event_hash into prev from ownership_events order by created_at desc,id desc limit 1;prev:=coalesce(prev,'GENESIS');
 h:=encode(digest(concat_ws('|',d.id,d.product_id,d.seller_id,d.buyer_id,now(),prev),'sha256'),'hex');
 -- The existing listing trigger needs a trusted server role for ownership mutation.
 perform set_config('request.jwt.claim.role','service_role',true);
 update deal_requests set status='completed',completed_at=now(),updated_at=now() where id=d.id;
 if not exists(select 1 from ownership_events where deal_id=d.id) then
 insert into ownership_events(product_id,deal_id,deal_code,previous_owner_id,new_owner_id,previous_hash,event_hash) values(d.product_id,d.id,d.deal_code,d.seller_id,d.buyer_id,prev,h);end if;
 update products set status='sold',current_owner_id=d.buyer_id,sold_deal_id=d.id where id=d.product_id;
 return 'completed';end $$;
revoke all on function confirm_deal_handover(uuid) from public,anon;
grant execute on function confirm_deal_handover(uuid) to authenticated;

-- Atomic review publication prevents an analysis of an old product revision from approving an edited lot.
create or replace function public.trust_publish_review(p_product bigint,p_version integer,p_review jsonb,p_hashes text[]) returns text language plpgsql security definer set search_path=public as $$
 declare p products%rowtype;s text;begin
 select * into p from products where id=p_product for update;
 if p.moderation_version<>p_version or p.status not in('pending','pending_review','changes_requested') then raise exception 'Listing changed. Analyse it again';end if;
 s:=case when (p_review->>'score')::integer>=80 and not (p_review->>'uncertain')::boolean and jsonb_array_length(p_review->'hardFlags')=0 and p_review->>'recommendation'='AUTO_APPROVE' then 'approved' else 'pending_review' end;
 insert into listing_ai_reviews(product_id,seller_id,version,score,risk_level,recommendation,hard_flags,checks,reasons,uncertain,source,image_hashes)
 values(p.id,p.seller_id,p_version,(p_review->>'score')::integer,p_review->>'riskLevel',p_review->>'recommendation',p_review->'hardFlags',p_review->'checks',p_review->'reasons',(p_review->>'uncertain')::boolean,p_review->>'source',p_hashes);
 update products set status=s,safety_score=(p_review->>'score')::integer,approval_method=case when s='approved' then 'ai_auto' else null end,approved_at=case when s='approved' then now() else null end where id=p.id;
 update product_images set verification_status=case when s='approved' then 'approved' else 'pending' end where product_id=p.id;
 insert into trust_audit_logs(entity_type,entity_id,action,details) values('listing',p.id::text,s,p_review);
 insert into deal_notifications(user_id,type,title,message,action_url) values(p.seller_id,'LISTING_REVIEW',case when s='approved' then 'Listing auto-approved' else 'Listing needs review' end,'Open your seller dashboard to see the result.','/seller/dashboard');
 return s;end $$;
revoke all on function trust_publish_review(bigint,integer,jsonb,text[]) from public,anon,authenticated;
grant execute on function trust_publish_review(bigint,integer,jsonb,text[]) to service_role;

-- Persist idempotent server actions in the same transaction as state, payment, evidence,
-- notification, and ownership effects. No browser role can execute this function.
create or replace function public.trust_delivery_action(p_deal uuid,p_actor uuid,p_action text,p_expected integer,p_key text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare d deal_requests%rowtype;v deliveries%rowtype;q delivery_quotes%rowtype;pay payments%rowtype;deposit seller_security_deposits%rowtype;
 target text; scope_key text;reqhash text;cached trust_idempotency%rowtype;isadmin boolean;result jsonb;prev text;h text;ev exchange_evidence%rowtype;dispute uuid;
begin
 select * into d from deal_requests where id=p_deal for update;if not found then raise exception 'Deal not found';end if;
 select exists(select 1 from profiles where id=p_actor and role='admin' and account_status='active') into isadmin;
 if p_actor not in(d.buyer_id,d.seller_id) and not isadmin then raise exception 'Participant access required';end if;
 if length(p_key)<8 or length(p_key)>120 then raise exception 'Idempotency key required';end if;
 scope_key:=p_deal::text||':'||p_actor::text;reqhash:=encode(digest(p_action||p_data::text,'sha256'),'hex');
 select * into cached from trust_idempotency where scope=scope_key and key=p_key;
 if found then if cached.request_hash<>reqhash then raise exception 'Idempotency key reused with different input';end if;return cached.result;end if;
 if d.secure_version<>p_expected then raise exception 'Deal changed. Refresh and retry';end if;
 if not trust_active(p_actor) and p_action not in('dispute','address') then raise exception 'Account restricted';end if;
 insert into deliveries(deal_id) values(d.id) on conflict(deal_id) do nothing;
 select * into v from deliveries where deal_id=d.id for update;
 select * into q from delivery_quotes where id=v.quote_id;
 target:=d.secure_state;
 if p_action='select_delivery' then
   perform 1 from products where id=d.product_id for update;
   if p_actor<>d.buyer_id or d.status<>'accepted' or d.secure_state is not null then raise exception 'Accepted deal and buyer required';end if;
   if (select status from products where id=d.product_id)<>'approved' then raise exception 'Product unavailable';end if;
   if exists(select 1 from deal_requests where product_id=d.product_id and id<>d.id and fulfilment_mode='secure_delivery' and secure_state not in('CANCELLED','EXPIRED','RETURNED')) then raise exception 'Product already reserved for delivery';end if;
   update products set status='reserved' where id=d.product_id;
   update deal_requests set fulfilment_mode='secure_delivery',secure_demo=coalesce((p_data->>'isDemo')::boolean,false) where id=d.id;
   target:='FULFILMENT_SELECTED';
 elsif p_action='address' then
   if d.secure_state not in('FULFILMENT_SELECTED','DELIVERY_QUOTED') then raise exception 'Addresses are locked after checkout';end if;
   if p_actor=d.seller_id then update deliveries set pickup=p_data->'location',pickup_confirmed_at=now(),quote_id=null where id=v.id;
   elsif p_actor=d.buyer_id then update deliveries set dropoff=p_data->'location',dropoff_confirmed_at=now(),quote_id=null where id=v.id;else raise exception 'Participant required';end if;
   target:='FULFILMENT_SELECTED';
 elsif p_action='quote' then
   if p_actor<>d.buyer_id or d.secure_state not in('FULFILMENT_SELECTED','DELIVERY_QUOTED') or v.pickup_confirmed_at is null or v.dropoff_confirmed_at is null then raise exception 'Both participants must confirm addresses';end if;
   if (p_data->>'productPaise')::bigint<>round(d.agreed_price*100)::bigint then raise exception 'Stale product price';end if;
   if (p_data->>'isDemo')::boolean<>d.secure_demo then raise exception 'Provider mode mismatch';end if;
   insert into delivery_quotes(deal_id,provider,provider_quote_id,product_paise,delivery_paise,service_paise,total_paise,deposit_paise,markup_percent,distance_km,expires_at,is_demo)
   values(d.id,p_data->>'provider',p_data->>'id',(p_data->>'productPaise')::bigint,(p_data->>'deliveryPaise')::bigint,(p_data->>'servicePaise')::bigint,(p_data->>'totalPaise')::bigint,(p_data->>'depositPaise')::bigint,(p_data->>'markupPercent')::numeric,(p_data->>'distanceKm')::numeric,(p_data->>'expiresAt')::timestamptz,d.secure_demo) returning * into q;
   update deliveries set quote_id=q.id where id=v.id;target:='DELIVERY_QUOTED';
 elsif p_action in('buyer_order','deposit_order') then
   if p_action='buyer_order' and (p_actor<>d.buyer_id or d.secure_state<>'DELIVERY_QUOTED' or q.expires_at<=now()) then raise exception 'Valid buyer quote required';end if;
   if p_action='deposit_order' and (p_actor<>d.seller_id or d.secure_state<>'SELLER_DEPOSIT_PENDING') then raise exception 'Seller deposit is not due';end if;
   insert into payments(deal_id,payer_id,kind,provider,provider_order_id,amount_paise,status,is_demo) values(d.id,p_actor,case when p_action='buyer_order' then 'buyer' else 'deposit' end,p_data->>'provider',p_data->>'orderId',case when p_action='buyer_order' then q.total_paise else q.deposit_paise end,'PENDING',d.secure_demo) returning * into pay;
   if p_action='deposit_order' then insert into seller_security_deposits(deal_id,payment_id,seller_id,amount_paise,status) values(d.id,pay.id,d.seller_id,q.deposit_paise,'PENDING');else target:='BUYER_PAYMENT_PENDING';end if;
 elsif p_action='payment_verified' then
   select * into pay from payments where deal_id=d.id and provider_order_id=p_data->>'orderId' for update;
   if pay.id is null or pay.status<>'PENDING' or pay.amount_paise<>(p_data->>'amountPaise')::bigint or pay.is_demo<>(p_data->>'isDemo')::boolean or p_data->>'currency'<>'INR' then raise exception 'Payment verification mismatch';end if;
   if pay.kind='buyer' and d.secure_state<>'BUYER_PAYMENT_PENDING' then raise exception 'Buyer payment not pending';end if;
   if pay.kind='deposit' and d.secure_state<>'SELLER_DEPOSIT_PENDING' then raise exception 'Seller deposit not pending';end if;
   update payments set status='HELD',updated_at=now() where id=pay.id;
   if pay.kind='buyer' then target:='SELLER_DEPOSIT_PENDING';else update seller_security_deposits set status='HELD' where deal_id=d.id;target:='PICKUP_EVIDENCE_PENDING';end if;
 elsif p_action='evidence' then
   if p_data->>'stage'='pickup' and (p_actor<>d.seller_id or d.secure_state not in('PICKUP_EVIDENCE_PENDING','PICKUP_REVIEW_REQUIRED')) then raise exception 'Seller pickup evidence is not due';end if;
   if p_data->>'stage'='delivery' and (p_actor<>d.buyer_id or d.secure_state not in('DELIVERY_EVIDENCE_PENDING','DELIVERY_REVIEW_REQUIRED')) then raise exception 'Buyer delivery evidence is not due';end if;
   if p_data->>'stage'='return' and (p_actor<>d.seller_id or d.secure_state<>'RETURN_DELIVERED') then raise exception 'Return evidence is not due';end if;
   if p_data->>'stage' not in('pickup','delivery','dispute','return') then raise exception 'Invalid evidence stage';end if;
   if jsonb_array_length(p_data->'photos')<3 or nullif(p_data->>'videoPath','') is null then raise exception 'Three photos and a short video are required';end if;
   insert into exchange_evidence(deal_id,product_id,uploaded_by,stage,photos,video_path,evidence_hash,location,ai_result,review_status)
   values(d.id,d.product_id,p_actor,p_data->>'stage',p_data->'photos',p_data->>'videoPath',p_data->>'hash',p_data->'location',p_data->'analysis',p_data->>'reviewStatus') returning * into ev;
   if ev.stage='pickup' then target:=case when ev.review_status='VERIFIED' then 'PICKUP_VERIFIED' else 'PICKUP_REVIEW_REQUIRED' end;if ev.review_status='VERIFIED' then update deliveries set pickup_verified_at=now() where id=v.id;end if;
   elsif ev.stage='delivery' then target:=case when ev.review_status='VERIFIED' then 'BUYER_CONFIRMATION_PENDING' else 'DELIVERY_REVIEW_REQUIRED' end;if ev.review_status='VERIFIED' then update deliveries set delivery_verified_at=now() where id=v.id;end if;end if;
 elsif p_action='review_evidence' then
   if not isadmin or length(coalesce(p_data->>'reason',''))<10 then raise exception 'Admin reason required';end if;
   select * into ev from exchange_evidence where id=(p_data->>'evidenceId')::uuid and deal_id=d.id for update;
   if ev.id is null then raise exception 'Evidence not found';end if;
   if d.secure_state='PICKUP_REVIEW_REQUIRED' and ev.stage='pickup' then target:='PICKUP_VERIFIED';update deliveries set pickup_verified_at=now() where id=v.id;
   elsif d.secure_state='DELIVERY_REVIEW_REQUIRED' and ev.stage='delivery' then target:='BUYER_CONFIRMATION_PENDING';update deliveries set delivery_verified_at=now() where id=v.id;
   elsif d.secure_state='RETURN_DELIVERED' and ev.stage='return' then target:='RETURN_VERIFIED';else raise exception 'Evidence review not due';end if;
   update exchange_evidence set review_status='VERIFIED' where id=ev.id;
 elsif p_action='book' then
   if p_actor<>d.seller_id or d.secure_state<>'PICKUP_VERIFIED' or v.pickup_verified_at is null or not exists(select 1 from seller_security_deposits where deal_id=d.id and status='HELD') then raise exception 'Verified pickup and held seller deposit required';end if;
   update deliveries set provider=p_data->>'provider',provider_booking_id=p_data->>'bookingId',provider_status='LOGISTICS_BOOKED' where id=v.id;target:='LOGISTICS_BOOKED';
 elsif p_action='tracking' then
   target:=p_data->>'state';
   if not ((d.secure_state='LOGISTICS_BOOKED' and target='DRIVER_ASSIGNED') or (d.secure_state='PICKUP_COMPLETED' and target='IN_TRANSIT') or (d.secure_state='IN_TRANSIT' and target='DELIVERY_EVIDENCE_PENDING')) then raise exception 'Invalid tracking transition';end if;
   update deliveries set provider_status=target where id=v.id;
 elsif p_action='buyer_confirm' then
   if p_actor<>d.buyer_id or d.secure_state<>'BUYER_CONFIRMATION_PENDING' or v.delivery_verified_at is null or v.pickup_verified_at is null or d.is_disputed then raise exception 'Verified, undisputed delivery required';end if;
   if not exists(select 1 from delivery_tokens where deal_id=d.id and purpose='delivery' and used_at is not null) then raise exception 'Delivery OTP confirmation required';end if;
   update deliveries set buyer_confirmed_at=now() where id=v.id;target:='PAYMENT_RELEASE_PENDING';
 elsif p_action='settle' then
   if d.secure_state<>'PAYMENT_RELEASE_PENDING' or d.is_disputed or v.buyer_confirmed_at is null or v.pickup_verified_at is null or v.delivery_verified_at is null then raise exception 'Settlement is frozen or not ready';end if;
   if not exists(select 1 from payments where deal_id=d.id and kind='buyer' and status='HELD') or not exists(select 1 from seller_security_deposits where deal_id=d.id and status='HELD') then raise exception 'Held funds required';end if;
   if nullif(p_data->>'releaseReference','') is null or nullif(p_data->>'refundReference','') is null then raise exception 'Verified provider settlement references required';end if;
   update payments set status=case when kind='buyer' then 'RELEASED' else 'REFUNDED' end,operation_reference=case when kind='buyer' then p_data->>'releaseReference' else p_data->>'refundReference' end where deal_id=d.id;
   update seller_security_deposits set status='REFUNDED' where deal_id=d.id;
   perform pg_advisory_xact_lock(180018);
   select event_hash into prev from ownership_events order by created_at desc,id desc limit 1;prev:=coalesce(prev,'GENESIS');
   select encode(digest(string_agg(evidence_hash,'|' order by created_at,id),'sha256'),'hex') into h from exchange_evidence where deal_id=d.id and review_status='VERIFIED';
   if not exists(select 1 from ownership_events where deal_id=d.id) then
   insert into ownership_events(product_id,deal_id,deal_code,previous_owner_id,new_owner_id,previous_hash,event_hash,evidence_hash,event_type)
   values(d.product_id,d.id,d.deal_code,d.seller_id,d.buyer_id,prev,encode(digest(concat_ws('|',d.id,d.product_id,d.seller_id,d.buyer_id,h,prev,now()),'sha256'),'hex'),h,case when d.secure_demo then 'demo_ownership_transfer' else 'ownership_transfer' end);end if;
   update products set status='sold',current_owner_id=d.buyer_id,sold_deal_id=d.id where id=d.product_id;
   update deal_requests set status='completed',completed_at=now() where id=d.id;target:='COMPLETED';
 elsif p_action='dispute' then
   if d.secure_state is null or d.secure_state in('COMPLETED','RETURNED','CANCELLED','EXPIRED','DISPUTED') then raise exception 'Dispute unavailable';end if;
   insert into deal_disputes(deal_id,raised_by,reason,description) values(d.id,p_actor,p_data->>'reason',p_data->>'description') returning id into dispute;
   update deal_requests set status='disputed',is_disputed=true where id=d.id;target:='DISPUTED';
 elsif p_action='resolve_dispute' then
   if not isadmin or d.secure_state<>'DISPUTED' or length(coalesce(p_data->>'reason',''))<10 then raise exception 'Admin reviewed outcome required';end if;
   if p_data->>'outcome'='request_evidence' then target:='DISPUTED';
   elsif p_data->>'outcome'='reject_claim' then
     if v.delivery_verified_at is null then raise exception 'Delivery evidence required before rejecting claim';end if;
     update deal_requests set is_disputed=false,status='accepted' where id=d.id;target:='BUYER_CONFIRMATION_PENDING';
     update deal_disputes set status='DISMISSED',resolution_notes=p_data->>'reason',resolved_at=now() where deal_id=d.id and status in('OPEN','INVESTIGATING');
   elsif p_data->>'outcome' in('return','partial_adjustment') then
     if (p_data->>'buyerRefundPaise')::bigint not between 0 and q.total_paise or (p_data->>'depositDeductionPaise')::bigint not between 0 and q.deposit_paise then raise exception 'Invalid reviewed monetary adjustment';end if;
     select id into dispute from deal_disputes where deal_id=d.id order by created_at desc limit 1;
     insert into delivery_returns(deal_id,dispute_id,state,reason,buyer_refund_paise,deposit_deduction_paise,reviewed_by,reviewed_at)
     values(d.id,dispute,'RETURN_REQUESTED',p_data->>'reason',(p_data->>'buyerRefundPaise')::bigint,(p_data->>'depositDeductionPaise')::bigint,p_actor,now());target:='RETURN_REQUESTED';
   else raise exception 'Unknown outcome';end if;
 elsif p_action='return_progress' then
   if not isadmin then raise exception 'Admin required';end if;target:=p_data->>'state';
   if not ((d.secure_state='RETURN_REQUESTED' and target='RETURN_BOOKING') or (d.secure_state='RETURN_BOOKING' and target='RETURN_PICKUP') or (d.secure_state='RETURN_PICKUP' and target='RETURN_IN_TRANSIT') or (d.secure_state='RETURN_IN_TRANSIT' and target='RETURN_DELIVERED')) then raise exception 'Invalid return transition';end if;
   update delivery_returns set state=target where deal_id=d.id;
 elsif p_action='return_settle' then
   if not isadmin or d.secure_state<>'RETURN_VERIFIED' or nullif(p_data->>'refundReference','') is null then raise exception 'Reviewed return and provider refund required';end if;
   update payments set status='REFUNDED',operation_reference=p_data->>'refundReference' where deal_id=d.id;
   update seller_security_deposits sd set deducted_paise=r.deposit_deduction_paise,status=case when r.deposit_deduction_paise=0 then 'REFUNDED' when r.deposit_deduction_paise=sd.amount_paise then 'FORFEITED_AFTER_REVIEW' else 'PARTIALLY_DEDUCTED' end,review_reason=r.reason from delivery_returns r where sd.deal_id=d.id and r.deal_id=d.id;
   update delivery_returns set state='RETURNED' where deal_id=d.id;update deal_disputes set status='RESOLVED_REFUND',resolved_at=now() where deal_id=d.id;
   update products set status='pending_review' where id=d.product_id;target:='RETURNED';
 elsif p_action in('cancel','expire') then
   if d.secure_state not in('FULFILMENT_SELECTED','DELIVERY_QUOTED','BUYER_PAYMENT_PENDING') or exists(select 1 from payments where deal_id=d.id and status in('PAID','HELD')) then raise exception 'Paid deals need a reviewed refund';end if;
   target:=case when p_action='expire' then 'EXPIRED' else 'CANCELLED' end;update products set status='approved' where id=d.product_id;update deal_requests set status='cancelled' where id=d.id;
 else raise exception 'Unknown action';end if;
 update deal_requests set secure_state=target,secure_version=secure_version+1,updated_at=now() where id=d.id;
 insert into deal_audit_logs(deal_id,actor_id,event_type,metadata) values(d.id,p_actor,p_action,jsonb_build_object('from',d.secure_state,'to',target,'isDemo',d.secure_demo));
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(p_actor,'deal',d.id::text,p_action,jsonb_build_object('from',d.secure_state,'to',target,'reason',p_data->>'reason'));
 insert into deal_notifications(user_id,deal_id,type,title,message,action_url) select u,d.id,p_action,'Secure Delivery update',replace(coalesce(target,'Updated'),'_',' '),'/deals/'||d.id from unnest(array[d.buyer_id,d.seller_id]) u;
 result:=jsonb_build_object('state',target,'version',d.secure_version+1);insert into trust_idempotency values(scope_key,p_key,reqhash,result,now());return result;
end $$;
revoke all on function trust_delivery_action(uuid,uuid,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function trust_delivery_action(uuid,uuid,text,integer,text,jsonb) to service_role;

-- Atomic expiry, attempts, single use and state update. The token grants only handover.
create or replace function public.trust_verify_delivery_token(p_token text,p_otp text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
 declare t delivery_tokens%rowtype;d deal_requests%rowtype;next_state text;begin
 select * into t from delivery_tokens where token_hash=encode(digest(p_token,'sha256'),'hex');
 if t.id is null then return jsonb_build_object('ok',false);end if;
 select * into d from deal_requests where id=t.deal_id for update;
 select * into t from delivery_tokens where id=t.id for update;
 if t.used_at is not null or t.revoked_at is not null or t.expires_at<=now() or t.attempts>=5 or d.is_disputed then return jsonb_build_object('ok',false);end if;
 update delivery_tokens set attempts=attempts+1 where id=t.id;
 if crypt(p_otp,t.otp_hash)<>t.otp_hash then return jsonb_build_object('ok',false);end if;
 if t.purpose='pickup' then
   if d.secure_state<>'DRIVER_ASSIGNED' or not exists(select 1 from deliveries where deal_id=d.id and pickup_verified_at is not null) then return jsonb_build_object('ok',false);end if;next_state:='PICKUP_COMPLETED';
 else if d.secure_state<>'BUYER_CONFIRMATION_PENDING' then return jsonb_build_object('ok',false);end if;next_state:=d.secure_state;end if;
 update delivery_tokens set used_at=now() where id=t.id;
 update deal_requests set secure_state=next_state,secure_version=secure_version+1 where id=d.id;
 insert into deal_audit_logs(deal_id,event_type,metadata) values(d.id,t.purpose||'_otp_verified',jsonb_build_object('tokenId',t.id));
 return jsonb_build_object('ok',true,'state',next_state);end $$;
revoke all on function trust_verify_delivery_token(text,text) from public,anon,authenticated;
grant execute on function trust_verify_delivery_token(text,text) to service_role;

-- Claimable OTP is never returned by SELECT or stored in plaintext.
create or replace function public.trust_issue_delivery_token(p_deal uuid,p_actor uuid,p_purpose text,p_token text,p_otp text) returns timestamptz language plpgsql security definer set search_path=public,extensions as $$
declare d deal_requests%rowtype;e timestamptz:=now()+interval '10 minutes';begin
select * into d from deal_requests where id=p_deal for update;
if p_purpose='pickup' then if p_actor<>d.seller_id or d.secure_state<>'DRIVER_ASSIGNED' then raise exception 'Pickup token not due';end if;
elsif p_purpose='delivery' then if p_actor<>d.buyer_id or d.secure_state<>'BUYER_CONFIRMATION_PENDING' then raise exception 'Delivery token not due';end if;
else raise exception 'Invalid purpose';end if;
update delivery_tokens set revoked_at=now() where deal_id=d.id and purpose=p_purpose and used_at is null;
insert into delivery_tokens(deal_id,purpose,token_hash,otp_hash,expires_at) values(d.id,p_purpose,encode(digest(p_token,'sha256'),'hex'),crypt(p_otp,gen_salt('bf')),e);return e;end $$;
revoke all on function trust_issue_delivery_token(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function trust_issue_delivery_token(uuid,uuid,text,text,text) to service_role;
-- Call lifecycle is authenticated and atomic; browser RPCs cannot manufacture consent.
create or replace function public.trust_call_action(p_actor uuid,p_action text,p_call uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare c calls%rowtype;d deal_requests%rowtype;receiver uuid;begin
 if p_action='start' then
  receiver:=(p_data->>'targetUserId')::uuid;
  if receiver=p_actor or not trust_active(p_actor) or not trust_active(receiver) or p_data->>'consent' is distinct from 'true' then raise exception 'Active participants and consent required';end if;
  if nullif(p_data->>'dealId','') is not null then
   select * into d from deal_requests where id=(p_data->>'dealId')::uuid;
   if d.id is null or p_actor not in(d.buyer_id,d.seller_id) or receiver not in(d.buyer_id,d.seller_id) then raise exception 'Deal call access denied';end if;
  elsif not exists(select 1 from products where id=(p_data->>'productId')::bigint and seller_id in(p_actor,receiver) and status='approved') then raise exception 'An approved product or shared deal is required';end if;
  insert into calls(caller_id,receiver_id,product_id,deal_id,status,recording_consent)
  values(p_actor,receiver,coalesce(d.product_id,nullif(p_data->>'productId','')::bigint),d.id,'RINGING',jsonb_build_object(p_actor::text,now(),'noticeVersion','2026-09-v1')) returning * into c;
 else
  select * into c from calls where id=p_call for update;
  if c.id is null or p_actor not in(c.caller_id,c.receiver_id) then raise exception 'Call access denied';end if;
  if p_action='accept' then
   if p_actor<>c.receiver_id or c.status<>'RINGING' or not trust_active(p_actor) or not trust_active(c.caller_id) or p_data->>'consent' is distinct from 'true' or not c.recording_consent ? c.caller_id::text then raise exception 'Consent and ringing call required';end if;
   update calls set status='ACCEPTED',answered_at=now(),recording_consent=recording_consent||jsonb_build_object(p_actor::text,now()) where id=c.id;
  elsif p_action='reject' then
   if p_actor<>c.receiver_id or c.status<>'RINGING' then raise exception 'Call is not ringing';end if;
   update calls set status='DECLINED',ended_at=now() where id=c.id;
  elsif p_action='end' then
   update calls set status=case when answered_at is null then 'CANCELLED' else 'ENDED' end,ended_at=now(),duration_seconds=greatest(0,extract(epoch from now()-coalesce(answered_at,now()))::integer) where id=c.id and status in('RINGING','ACCEPTED');
  else raise exception 'Invalid call action';end if;
 end if;
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action) values(p_actor,'call',c.id::text,p_action);
 return jsonb_build_object('callId',c.id);end $$;
revoke all on function trust_call_action(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function trust_call_action(uuid,text,uuid,jsonb) to service_role;

create or replace function public.trust_save_call_analysis(p_call uuid,p_actor uuid,p_segments jsonb,p_analysis jsonb) returns void language plpgsql security definer set search_path=public as $$
declare c calls%rowtype;s jsonb;target uuid;action text;begin
 select * into c from calls where id=p_call for update;
 if c.id is null or p_actor not in(c.caller_id,c.receiver_id) or not c.recording_consent ? c.caller_id::text or not c.recording_consent ? c.receiver_id::text then raise exception 'Consented call required';end if;
 if exists(select 1 from call_recordings where call_id=c.id and uploaded_by=p_actor and status='COMPLETE') then return;end if;
 for s in select * from jsonb_array_elements(p_segments) loop
  insert into call_transcripts(call_id,speaker_user_id,text,start_time,end_time,confidence,attribution_verified) values(c.id,(s->>'speakerUserId')::uuid,s->>'text',(s->>'start')::numeric,(s->>'end')::numeric,(s->>'confidence')::numeric,coalesce((s->>'attributionVerified')::boolean,false));
 end loop;
 action:=p_analysis->>'recommendedAction';target:=nullif(p_analysis->>'initiatorUserId','')::uuid;
 if action='BLOCK_AND_REVIEW' then
  if target is null or target not in(c.caller_id,c.receiver_id) or (p_analysis->>'confidence')::numeric<0.95 or not exists(select 1 from call_transcripts where call_id=c.id and speaker_user_id=target and attribution_verified and confidence>=0.95) then raise exception 'Verified attribution required for automatic restriction';end if;
  update profiles set account_status='safety_blocked' where id=target;
 elsif action='HOLD_FOR_REVIEW' then
  -- Unverified client audio holds the case for review. Do not punish a person whose voice is unverified.
  if target in(c.caller_id,c.receiver_id) then update profiles set account_status='safety_hold' where id=target and account_status='active';end if;
 end if;
 if action<>'NONE' then
  insert into communication_risk_events(call_id,deal_id,actor_id,reported_user_id,risk_type,risk_score,confidence,snippet_excerpt,review_status,analysis,action_taken)
  values(c.id,c.deal_id,p_actor,target,'OFF_PLATFORM_DIVERSION',(p_analysis->>'riskScore')::integer,case when action='BLOCK_AND_REVIEW' then 'HIGH' else 'MEDIUM' end,left(p_analysis->'evidence'->0->>'text',600),'PENDING',p_analysis,action);
 end if;
 update call_recordings set status='COMPLETE',error=null where call_id=c.id and uploaded_by=p_actor;
 update calls set transcription_status='COMPLETE',risk_score=greatest(coalesce(risk_score,0),(p_analysis->>'riskScore')::integer),is_diverted=coalesce(is_diverted,false) or (p_analysis->>'diversionDetected')::boolean where id=c.id;
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(p_actor,'call',c.id::text,'analysis_completed',p_analysis);
end $$;
revoke all on function trust_save_call_analysis(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function trust_save_call_analysis(uuid,uuid,jsonb,jsonb) to service_role;

create or replace function public.trust_admin_action(p_actor uuid,p_action text,p_id text,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare r communication_risk_events%rowtype;begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and account_status='active' and not coalesce(is_banned,false)) or length(trim(p_reason))<10 then raise exception 'Active admin and review reason required';end if;
 if p_action in('approve','reject','changes') then
  perform 1 from products where id=p_id::bigint and status not in('sold','reserved') for update;if not found then raise exception 'Listing unavailable for moderation';end if;
  update products set status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'changes_requested' end,approval_method=case when p_action='approve' then 'admin' else null end,approved_at=case when p_action='approve' then now() else null end where id=p_id::bigint;
  update product_images set verification_status=case when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else 'pending' end where product_id=p_id::bigint;
 elsif p_action in('restore','warn','block','dismiss') then
  select * into r from communication_risk_events where id=p_id::uuid for update;if r.id is null then raise exception 'Safety event not found';end if;
  if p_action<>'dismiss' and r.reported_user_id is null then raise exception 'Review speaker identity before applying an account action';end if;
  update profiles set account_status=case when p_action='block' then 'safety_blocked' else 'active' end,warning_count=coalesce(warning_count,0)+case when p_action='warn' then 1 else 0 end where id=r.reported_user_id;
  update communication_risk_events set review_status=case when p_action='dismiss' then 'FALSE_POSITIVE' when p_action='block' then 'RESTRICTED' else 'REVIEWED' end,admin_notes=p_reason,action_taken=p_action where id=r.id;
 else raise exception 'Unknown admin action';end if;
 insert into trust_audit_logs(actor_id,entity_type,entity_id,action,details) values(p_actor,'moderation',p_id,p_action,jsonb_build_object('reason',p_reason));
end $$;
revoke all on function trust_admin_action(uuid,text,text,text) from public,anon,authenticated;
grant execute on function trust_admin_action(uuid,text,text,text) to service_role;

-- Guard image edits against publishing stale AI assessments or self-approved photos.
create or replace function public.trust_image_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare pid bigint;begin
 if coalesce(auth.role(),'')='service_role' or trust_is_admin() then return coalesce(new,old);end if;
 pid:=case when tg_op='DELETE' then old.product_id else new.product_id end;
 perform 1 from products where id=pid and seller_id=auth.uid() and status not in('sold','reserved') for update;
 if not found or not trust_active(auth.uid()) then raise exception 'Listing image access denied';end if;
 if tg_op='UPDATE' and new.product_id<>old.product_id then raise exception 'Image product is immutable';end if;
 if tg_op<>'DELETE' then new.verification_status:='pending';end if;
 perform set_config('request.jwt.claim.role','service_role',true);
 update products set status='pending_review',safety_score=null,approval_method=null,approved_at=null,moderation_version=moderation_version+1 where id=pid;
 perform set_config('request.jwt.claim.role','authenticated',true);
 return coalesce(new,old);end $$;
create trigger trust_image_guard before insert or update or delete on product_images for each row execute function trust_image_guard();
-- Older permissive policies must not allow clients to bypass the server safety layer.
revoke insert,update,delete on calls,communication_risk_events,ownership_events from anon,authenticated;
-- Private realtime topics: only a recipient can receive, only an active counterparty can send.
create policy trust_signal_receive on realtime.messages for select to authenticated using(extension='broadcast' and realtime.topic()='user-signaling-'||auth.uid()::text);
create policy trust_signal_send on realtime.messages for insert to authenticated with check(extension='broadcast' and exists(select 1 from calls where status in('RINGING','ACCEPTED') and ((caller_id=auth.uid() and realtime.topic()='user-signaling-'||receiver_id::text) or (receiver_id=auth.uid() and realtime.topic()='user-signaling-'||caller_id::text))));
-- Public discovery uses coarse coordinates; exact saved addresses remain owner/admin-only.
create or replace view public.public_profiles with (security_barrier=true) as
 select id,full_name,avatar_url,verification_status,trust_score,
 round(latitude::numeric,2) as latitude,round(longitude::numeric,2) as longitude,
 case when latitude is not null and longitude is not null then 'Approximate area only' else null end::text as location_name
 from public.profiles;
grant select on public.public_profiles to anon,authenticated;
create policy trust_profile_private on profiles as restrictive for select to anon,authenticated using(id=auth.uid() or trust_is_admin());
-- Known legacy SECURITY DEFINER mutation entry points must not bypass phase 18.
do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('initiate_call','update_call_status','report_communication_risk') loop
 execute format('revoke execute on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
commit;
