-- ====================================================================
-- ECOMATCH PHASE 16: SAFE DEAL ROOM V2 + PLATFORM-WIDE SECURE CALLING
-- AND AI COMMUNICATION SAFETY SYSTEM
-- ====================================================================

create extension if not exists pgcrypto;

-- 1. EXTEND PROFILES FOR PRESENCE, CALLS & NOTIFICATIONS
alter table public.profiles
  add column if not exists presence_status text default 'online'
    check (presence_status in ('online', 'offline', 'busy', 'in_call', 'do_not_disturb')),
  add column if not exists last_active_at timestamptz default now(),
  add column if not exists notification_preferences jsonb default '{"calls": true, "deals": true, "chat": true, "safety": true}'::jsonb;

-- 2. PLATFORM-WIDE CALLS TABLE
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  deal_id uuid references public.deal_requests(id) on delete set null,
  status text not null default 'RINGING'
    check (status in ('RINGING', 'ACCEPTED', 'DECLINED', 'MISSED', 'ENDED', 'FAILED', 'CANCELLED')),
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  end_reason text,
  risk_status text not null default 'LOW'
    check (risk_status in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at timestamptz not null default now()
);

create index if not exists idx_calls_caller on public.calls(caller_id, created_at desc);
create index if not exists idx_calls_receiver on public.calls(receiver_id, created_at desc);
create index if not exists idx_calls_deal on public.calls(deal_id);
create index if not exists idx_calls_status on public.calls(status);

alter table public.calls enable row level security;

drop policy if exists "participants can view calls" on public.calls;
create policy "participants can view calls" on public.calls
  for select to authenticated
  using (auth.uid() = caller_id or auth.uid() = receiver_id);

drop policy if exists "authenticated can insert calls" on public.calls;
create policy "authenticated can insert calls" on public.calls
  for insert to authenticated
  with check (auth.uid() = caller_id and caller_id <> receiver_id);

drop policy if exists "participants can update calls" on public.calls;
create policy "participants can update calls" on public.calls
  for update to authenticated
  using (auth.uid() = caller_id or auth.uid() = receiver_id)
  with check (auth.uid() = caller_id or auth.uid() = receiver_id);

-- 3. AI COMMUNICATION RISK EVENTS (FOR CHAT & CALLS)
create table if not exists public.communication_risk_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.calls(id) on delete set null,
  deal_id uuid references public.deal_requests(id) on delete set null,
  conversation_id bigint references public.conversations(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  risk_type text not null,
  risk_score integer not null default 0,
  confidence text not null default 'MEDIUM' check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  snippet_excerpt text,
  review_status text not null default 'PENDING' check (review_status in ('PENDING', 'REVIEWED', 'FALSE_POSITIVE', 'RESTRICTED')),
  admin_notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_risk_events_created on public.communication_risk_events(created_at desc);
create index if not exists idx_risk_events_status on public.communication_risk_events(review_status);

alter table public.communication_risk_events enable row level security;

drop policy if exists "users can view own reported risk events" on public.communication_risk_events;
create policy "users can view own reported risk events" on public.communication_risk_events
  for select to authenticated
  using (auth.uid() = actor_id);

-- 4. USER COMMUNICATION REPORTS
create table if not exists public.communication_reports (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.calls(id) on delete set null,
  deal_id uuid references public.deal_requests(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  description text,
  status text not null default 'PENDING' check (status in ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  created_at timestamptz not null default now()
);

alter table public.communication_reports enable row level security;

drop policy if exists "reporters can view their own reports" on public.communication_reports;
create policy "reporters can view their own reports" on public.communication_reports
  for select to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "reporters can insert reports" on public.communication_reports;
create policy "reporters can insert reports" on public.communication_reports
  for insert to authenticated
  with check (auth.uid() = reporter_id and reporter_id <> reported_user_id);

-- 5. UNIFIED IN-APP NOTIFICATIONS
create table if not exists public.deal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid references public.deal_requests(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_notifications_user on public.deal_notifications(user_id, read_at);

alter table public.deal_notifications enable row level security;

drop policy if exists "users view own notifications" on public.deal_notifications;
create policy "users view own notifications" on public.deal_notifications
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on public.deal_notifications;
create policy "users update own notifications" on public.deal_notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. IMMUTABLE DEAL AUDIT LOGS (TIMELINE)
create table if not exists public.deal_audit_logs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deal_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_audit_deal on public.deal_audit_logs(deal_id, created_at asc);

alter table public.deal_audit_logs enable row level security;

drop policy if exists "participants view deal audit logs" on public.deal_audit_logs;
create policy "participants view deal audit logs" on public.deal_audit_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.deal_requests d
      where d.id = deal_id and (d.buyer_id = auth.uid() or d.seller_id = auth.uid())
    )
  );

-- 7. SECURE SINGLE-USE SHORT-LIVED QR TOKENS
create table if not exists public.deal_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deal_requests(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_qr_deal on public.deal_qr_tokens(deal_id);
create index if not exists idx_deal_qr_token on public.deal_qr_tokens(token_hash);

alter table public.deal_qr_tokens enable row level security;

drop policy if exists "participants can view qr tokens" on public.deal_qr_tokens;
create policy "participants can view qr tokens" on public.deal_qr_tokens
  for select to authenticated
  using (
    exists (
      select 1 from public.deal_requests d
      where d.id = deal_id and (d.buyer_id = auth.uid() or d.seller_id = auth.uid())
    )
  );

-- 8. FORMAL DEAL DISPUTES TABLE
create table if not exists public.deal_disputes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deal_requests(id) on delete cascade,
  raised_by uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN', 'INVESTIGATING', 'RESOLVED_REFUND', 'RESOLVED_COMPLETED', 'DISMISSED')),
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.deal_disputes enable row level security;

drop policy if exists "participants view disputes" on public.deal_disputes;
create policy "participants view disputes" on public.deal_disputes
  for select to authenticated
  using (
    exists (
      select 1 from public.deal_requests d
      where d.id = deal_id and (d.buyer_id = auth.uid() or d.seller_id = auth.uid())
    )
  );

drop policy if exists "participants insert disputes" on public.deal_disputes;
create policy "participants insert disputes" on public.deal_disputes
  for insert to authenticated
  with check (
    auth.uid() = raised_by and
    exists (
      select 1 from public.deal_requests d
      where d.id = deal_id and (d.buyer_id = auth.uid() or d.seller_id = auth.uid())
    )
  );

-- 9. EXTEND DEAL_REQUESTS TABLE FOR V2 ENHANCEMENTS
alter table public.deal_requests
  add column if not exists meeting_safety_score integer default 92,
  add column if not exists meeting_safety_factors jsonb default '{"public_location": true, "daytime_window": true, "buyer_verified": false, "seller_verified": false, "location_confirmed": false}'::jsonb,
  add column if not exists qr_verified_at timestamptz,
  add column if not exists proximity_verified boolean not null default false,
  add column if not exists proximity_distance_meters double precision,
  add column if not exists is_disputed boolean not null default false;

-- Expand deal status check to support disputed & cancelled
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
    'meeting_proposed',
    'meeting_planned',
    'meeting_confirmed',
    'handover_ready',
    'exchange_ready',
    'handover_verified',
    'completed',
    'disputed'
  ));

-- ---------------------------------------------------------
-- RPC: INITIATE CALL
-- ---------------------------------------------------------
create or replace function public.initiate_call(
  p_receiver_id uuid,
  p_product_id bigint default null,
  p_deal_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_call_id uuid;
begin
  if v_caller is null then raise exception 'Authentication required'; end if;
  if v_caller = p_receiver_id then raise exception 'Cannot call yourself'; end if;

  -- Insert call record
  insert into public.calls (caller_id, receiver_id, product_id, deal_id, status)
  values (v_caller, p_receiver_id, p_product_id, p_deal_id, 'RINGING')
  returning id into v_call_id;

  -- Create in-app notification for receiver
  insert into public.deal_notifications (user_id, deal_id, call_id, type, title, message, action_url)
  values (
    p_receiver_id,
    p_deal_id,
    v_call_id,
    'INCOMING_CALL',
    'Incoming Secure Call',
    'A marketplace member is calling you regarding a listing.',
    coalesce('/deals/' || p_deal_id, '/chat')
  );

  return jsonb_build_object('call_id', v_call_id, 'status', 'RINGING');
end;
$$;

grant execute on function public.initiate_call(uuid, bigint, uuid) to authenticated;

-- ---------------------------------------------------------
-- RPC: UPDATE CALL STATUS
-- ---------------------------------------------------------
create or replace function public.update_call_status(
  p_call_id uuid,
  p_status text,
  p_duration_seconds integer default 0,
  p_end_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_call public.calls%rowtype;
begin
  select * into v_call from public.calls where id = p_call_id;
  if not found then raise exception 'Call not found'; end if;
  if v_user <> v_call.caller_id and v_user <> v_call.receiver_id then
    raise exception 'Unauthorized';
  end if;

  update public.calls
  set status = p_status,
      duration_seconds = greatest(duration_seconds, p_duration_seconds),
      end_reason = coalesce(p_end_reason, end_reason),
      answered_at = case when p_status = 'ACCEPTED' and answered_at is null then now() else answered_at end,
      ended_at = case when p_status in ('ENDED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED') and ended_at is null then now() else ended_at end
  where id = p_call_id;

  -- If missed call, notify receiver
  if p_status = 'MISSED' then
    insert into public.deal_notifications (user_id, deal_id, call_id, type, title, message)
    values (
      v_call.receiver_id,
      v_call.deal_id,
      p_call_id,
      'MISSED_CALL',
      'Missed EcoMatch Call',
      'You missed a secure marketplace voice call.'
    );
  end if;

  -- If call ended and tied to a deal, record in audit logs
  if p_status = 'ENDED' and v_call.deal_id is not null then
    insert into public.deal_audit_logs (deal_id, actor_id, event_type, metadata)
    values (
      v_call.deal_id,
      v_user,
      'CALL_COMPLETED',
      jsonb_build_object('duration_seconds', p_duration_seconds, 'call_id', p_call_id)
    );
  end if;

  return true;
end;
$$;

grant execute on function public.update_call_status(uuid, text, integer, text) to authenticated;

-- ---------------------------------------------------------
-- RPC: GENERATE SECURE HANDOVER QR TOKEN (5-MIN EXPIRY)
-- ---------------------------------------------------------
create or replace function public.generate_secure_handover_qr(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deal public.deal_requests%rowtype;
  v_raw_token text;
  v_token_hash text;
begin
  select * into v_deal from public.deal_requests where id = p_deal_id;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> v_deal.seller_id then
    raise exception 'Only the seller can generate the handover QR code';
  end if;

  -- Generate cryptographically random token
  v_raw_token := 'ECMQR-' || encode(gen_random_bytes(16), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  -- Invalidate previous tokens for this deal
  delete from public.deal_qr_tokens where deal_id = p_deal_id and used_at is null;

  insert into public.deal_qr_tokens (deal_id, token_hash, expires_at)
  values (p_deal_id, v_token_hash, now() + interval '5 minutes');

  insert into public.deal_audit_logs (deal_id, actor_id, event_type, metadata)
  values (p_deal_id, auth.uid(), 'QR_CREATED', jsonb_build_object('expires_in', 300));

  return v_raw_token;
end;
$$;

grant execute on function public.generate_secure_handover_qr(uuid) to authenticated;

-- ---------------------------------------------------------
-- RPC: VERIFY SECURE HANDOVER QR TOKEN
-- ---------------------------------------------------------
create or replace function public.verify_secure_handover_qr(
  p_deal_id uuid,
  p_raw_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deal public.deal_requests%rowtype;
  v_token_record public.deal_qr_tokens%rowtype;
  v_hash text;
begin
  select * into v_deal from public.deal_requests where id = p_deal_id;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> v_deal.buyer_id then
    raise exception 'Only the buyer can scan and verify the handover QR';
  end if;

  v_hash := encode(digest(trim(p_raw_token), 'sha256'), 'hex');

  select * into v_token_record
  from public.deal_qr_tokens
  where deal_id = p_deal_id and token_hash = v_hash;

  if not found then
    raise exception 'Invalid or unrecognized QR token';
  end if;

  if v_token_record.used_at is not null then
    raise exception 'This QR token has already been used';
  end if;

  if now() > v_token_record.expires_at then
    raise exception 'This QR code has expired. Please ask the seller to refresh it.';
  end if;

  -- Mark token used
  update public.deal_qr_tokens set used_at = now() where id = v_token_record.id;

  -- Mark QR verified on deal
  update public.deal_requests set qr_verified_at = now(), updated_at = now() where id = p_deal_id;

  insert into public.deal_audit_logs (deal_id, actor_id, event_type, metadata)
  values (p_deal_id, auth.uid(), 'QR_VERIFIED', jsonb_build_object('verified_at', now()));

  return true;
end;
$$;

grant execute on function public.verify_secure_handover_qr(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- RPC: VERIFY GEO-PROXIMITY SERVER-SIDE (HAVERSINE)
-- ---------------------------------------------------------
create or replace function public.verify_deal_proximity(
  p_deal_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_is_buyer boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deal public.deal_requests%rowtype;
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
  dist_meters double precision;
  other_lat double precision;
  other_lng double precision;
  peer_dist_meters double precision;
begin
  select * into v_deal from public.deal_requests where id = p_deal_id;
  if not found then raise exception 'Deal not found'; end if;

  if p_is_buyer and auth.uid() <> v_deal.buyer_id then raise exception 'Unauthorized'; end if;
  if not p_is_buyer and auth.uid() <> v_deal.seller_id then raise exception 'Unauthorized'; end if;

  -- Store checkin coordinates
  if p_is_buyer then
    update public.deal_requests
    set buyer_checkin_latitude = p_lat,
        buyer_checkin_longitude = p_lng,
        buyer_checked_in_at = now(),
        updated_at = now()
    where id = p_deal_id;
    other_lat := v_deal.seller_checkin_latitude;
    other_lng := v_deal.seller_checkin_longitude;
  else
    update public.deal_requests
    set seller_checkin_latitude = p_lat,
        seller_checkin_longitude = p_lng,
        seller_checked_in_at = now(),
        updated_at = now()
    where id = p_deal_id;
    other_lat := v_deal.buyer_checkin_latitude;
    other_lng := v_deal.buyer_checkin_longitude;
  end if;

  -- Calculate distance to agreed meeting coordinates if set
  if v_deal.meeting_latitude is not null and v_deal.meeting_longitude is not null then
    dlat := radians(p_lat - v_deal.meeting_latitude);
    dlon := radians(p_lng - v_deal.meeting_longitude);
    a := sin(dlat/2)^2 + cos(radians(v_deal.meeting_latitude)) * cos(radians(p_lat)) * sin(dlon/2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    dist_meters := 6371000 * c;
  else
    dist_meters := 25.0;
  end if;

  -- If counterparty has also checked in, calculate proximity between them
  if other_lat is not null and other_lng is not null then
    dlat := radians(p_lat - other_lat);
    dlon := radians(p_lng - other_lng);
    a := sin(dlat/2)^2 + cos(radians(other_lat)) * cos(radians(p_lat)) * sin(dlon/2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    peer_dist_meters := 6371000 * c;
  else
    peer_dist_meters := dist_meters;
  end if;

  -- If within 250m of meeting point, or within 200m of each other, verify
  if dist_meters <= 250 or peer_dist_meters <= 200 then
    update public.deal_requests
    set proximity_verified = true,
        proximity_distance_meters = peer_dist_meters
    where id = p_deal_id;
  end if;

  return jsonb_build_object(
    'verified', (dist_meters <= 250 or peer_dist_meters <= 200),
    'distance_to_meeting_meters', round(dist_meters),
    'distance_to_peer_meters', round(peer_dist_meters)
  );
end;
$$;

grant execute on function public.verify_deal_proximity(uuid, double precision, double precision, boolean) to authenticated;

-- ---------------------------------------------------------
-- RPC: RAISE DEAL DISPUTE
-- ---------------------------------------------------------
create or replace function public.raise_deal_dispute(
  p_deal_id uuid,
  p_reason text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deal public.deal_requests%rowtype;
  v_dispute_id uuid;
  v_other_user uuid;
begin
  select * into v_deal from public.deal_requests where id = p_deal_id;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> v_deal.buyer_id and auth.uid() <> v_deal.seller_id then
    raise exception 'Unauthorized';
  end if;

  insert into public.deal_disputes (deal_id, raised_by, reason, description, status)
  values (p_deal_id, auth.uid(), p_reason, p_description, 'OPEN')
  returning id into v_dispute_id;

  -- Freeze deal status
  update public.deal_requests
  set status = 'disputed',
      is_disputed = true,
      updated_at = now()
  where id = p_deal_id;

  insert into public.deal_audit_logs (deal_id, actor_id, event_type, metadata)
  values (p_deal_id, auth.uid(), 'DISPUTE_RAISED', jsonb_build_object('reason', p_reason, 'dispute_id', v_dispute_id));

  v_other_user := case when auth.uid() = v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end;
  insert into public.deal_notifications (user_id, deal_id, type, title, message, action_url)
  values (
    v_other_user,
    p_deal_id,
    'DISPUTE_RAISED',
    'Deal Placed On Hold: Dispute Raised',
    'A dispute has been submitted for deal #' || v_deal.deal_code || '. Handover is temporarily frozen.',
    '/deals/' || p_deal_id
  );

  return v_dispute_id;
end;
$$;

grant execute on function public.raise_deal_dispute(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
