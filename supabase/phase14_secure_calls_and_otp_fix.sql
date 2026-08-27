-- ====================================================================
-- PHASE 14: SECURE IN-APP WEBRTC CALL LOGS, ADMIN CALL REVIEW & 2-STRIKE BAN,
-- AND INSTANT OTP HANDOVER OWNERSHIP TRANSFER REPAIR
-- ====================================================================

-- 0. FIX PRODUCTS STATUS CHECK CONSTRAINT (Allow 'sold' & 'completed')
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_status_check'
  ) then
    alter table public.products drop constraint products_status_check;
  end if;
end $$;

alter table public.products
  add constraint products_status_check
  check (status in ('pending', 'approved', 'rejected', 'sold', 'completed'));


-- 1. INSTANT OTP VERIFICATION & OWNERSHIP TRANSFER FUNCTION REPAIR
create or replace function public.verify_deal_exchange_code(p_deal_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  d public.deal_requests%rowtype;
  v_match boolean;
  previous_hash_value text;
  new_hash_value text;
begin
  select * into d from public.deal_requests where id = p_deal_id for update;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> d.buyer_id then raise exception 'Only the buyer can verify the exchange code'; end if;
  if d.status <> 'exchange_ready' and d.status <> 'accepted' and d.status <> 'meeting_planned' then
    raise exception 'Deal is not ready for handover';
  end if;
  if d.exchange_code_hash is null then raise exception 'Seller has not generated an exchange code yet'; end if;
  if d.exchange_code_expires_at is not null and now() > d.exchange_code_expires_at then
    raise exception 'Exchange OTP has expired. Ask seller to generate a new OTP';
  end if;
  if coalesce(d.exchange_code_attempts, 0) >= 8 then
    raise exception 'Too many incorrect OTP attempts. Ask seller to generate a new OTP';
  end if;

  v_match := encode(extensions.digest(trim(p_code), 'sha256'), 'hex') = d.exchange_code_hash;
  if not v_match then
    update public.deal_requests set exchange_code_attempts = coalesce(exchange_code_attempts, 0) + 1, updated_at = now() where id = p_deal_id;
    return false;
  end if;

  -- 1. Mark OTP as verified & complete handover
  update public.deal_requests
  set exchange_code_verified_at = now(),
      buyer_handover_confirmed_at = coalesce(buyer_handover_confirmed_at, now()),
      seller_handover_confirmed_at = coalesce(seller_handover_confirmed_at, now()),
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = p_deal_id;

  -- 2. Record immutable blockchain/ledger transfer block in ownership_events
  select event_hash into previous_hash_value from public.ownership_events order by created_at desc, id desc limit 1;
  previous_hash_value := coalesce(previous_hash_value, 'GENESIS');
  new_hash_value := encode(extensions.digest(concat_ws('|', d.id::text, d.deal_code, d.product_id::text, d.seller_id::text, d.buyer_id::text, now()::text, previous_hash_value), 'sha256'), 'hex');

  if not exists (select 1 from public.ownership_events where deal_id = d.id) then
    insert into public.ownership_events(product_id, deal_id, deal_code, previous_owner_id, new_owner_id, event_type, previous_hash, event_hash)
    values(d.product_id, d.id, d.deal_code, d.seller_id, d.buyer_id, 'ownership_transfer', previous_hash_value, new_hash_value);
  end if;

  -- 3. Transfer product ownership to buyer
  update public.products
  set status = 'sold',
      current_owner_id = d.buyer_id,
      sold_deal_id = d.id
  where id = d.product_id;

  return true;
end $$;

grant execute on function public.verify_deal_exchange_code(uuid, text) to authenticated, anon;


-- 2. CONFIRM HANDOVER REPAIR (Instant completion upon call)
create or replace function public.confirm_deal_handover(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  d public.deal_requests%rowtype;
  previous_hash_value text;
  new_hash_value text;
begin
  select * into d from public.deal_requests where id = p_deal_id for update;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> d.buyer_id and auth.uid() <> d.seller_id then
    raise exception 'Only deal participants can confirm handover';
  end if;

  -- 1. Complete handover
  update public.deal_requests
  set buyer_handover_confirmed_at = coalesce(buyer_handover_confirmed_at, now()),
      seller_handover_confirmed_at = coalesce(seller_handover_confirmed_at, now()),
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = p_deal_id;

  -- 2. Seal Blockchain/Ledger event in ownership_events
  select event_hash into previous_hash_value from public.ownership_events order by created_at desc, id desc limit 1;
  previous_hash_value := coalesce(previous_hash_value, 'GENESIS');
  new_hash_value := encode(extensions.digest(concat_ws('|', d.id::text, d.deal_code, d.product_id::text, d.seller_id::text, d.buyer_id::text, now()::text, previous_hash_value), 'sha256'), 'hex');

  if not exists (select 1 from public.ownership_events where deal_id = d.id) then
    insert into public.ownership_events(product_id, deal_id, deal_code, previous_owner_id, new_owner_id, event_type, previous_hash, event_hash)
    values(d.product_id, d.id, d.deal_code, d.seller_id, d.buyer_id, 'ownership_transfer', previous_hash_value, new_hash_value);
  end if;

  -- 3. Transfer product ownership to buyer
  update public.products
  set status = 'sold',
      current_owner_id = d.buyer_id,
      sold_deal_id = d.id
  where id = d.product_id;

  return 'completed';
end;
$$;

grant execute on function public.confirm_deal_handover(uuid) to authenticated, anon;


-- 3. AUTO-REPAIR ANY EXISTING STUCK DEALS WHERE OTP WAS VERIFIED
update public.deal_requests
set status = 'completed',
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
where exchange_code_verified_at is not null
  and status <> 'completed';

update public.products p
set status = 'sold',
    current_owner_id = d.buyer_id,
    sold_deal_id = d.id
from public.deal_requests d
where d.product_id = p.id
  and d.exchange_code_verified_at is not null
  and p.status <> 'sold';


-- 4. DEAL CALL LOGS TABLE
create table if not exists public.deal_call_logs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deal_requests(id) on delete cascade,
  caller_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  duration_seconds integer default 0,
  recording_url text,
  status text default 'completed',
  created_at timestamp with time zone default now()
);

alter table public.deal_call_logs enable row level security;

drop policy if exists "Participants and admin can view call logs" on public.deal_call_logs;
create policy "Participants and admin can view call logs"
  on public.deal_call_logs for select
  using (
    auth.uid() = caller_id or
    auth.uid() = receiver_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Authenticated users can insert call logs" on public.deal_call_logs;
create policy "Authenticated users can insert call logs"
  on public.deal_call_logs for insert
  with check (auth.uid() = caller_id or auth.uid() = receiver_id);


-- 5. PROFILES WARNING & 2-STRIKE BAN COLUMNS
alter table public.profiles add column if not exists warning_count integer default 0;
alter table public.profiles add column if not exists warning_reason text;
alter table public.profiles add column if not exists is_banned boolean default false;
alter table public.profiles add column if not exists banned_at timestamp with time zone;
alter table public.profiles add column if not exists ban_reason text;

-- 6. ADMIN WARNING & BAN RPC FUNCTION
create or replace function public.admin_issue_warning_or_ban(
  p_user_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_current_warnings integer;
begin
  select (role = 'admin') into v_admin from public.profiles where id = auth.uid();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('success', false, 'error', 'Unauthorized. Admin only.');
  end if;

  select coalesce(warning_count, 0) into v_current_warnings from public.profiles where id = p_user_id;

  if p_action = 'warning' then
    v_current_warnings := v_current_warnings + 1;
    if v_current_warnings >= 2 then
      update public.profiles
      set warning_count = v_current_warnings,
          is_banned = true,
          verification_status = 'banned',
          banned_at = now(),
          ban_reason = coalesce(p_reason, 'Auto-banned after reaching 2 safety strike warnings')
      where id = p_user_id;
      return jsonb_build_object('success', true, 'action', 'banned', 'warnings', v_current_warnings);
    else
      update public.profiles
      set warning_count = v_current_warnings,
          warning_reason = coalesce(p_reason, 'First warning: Attempted off-platform diversion or rule violation.')
      where id = p_user_id;
      return jsonb_build_object('success', true, 'action', 'warned', 'warnings', v_current_warnings);
    end if;
  elsif p_action = 'ban' then
    update public.profiles
    set is_banned = true,
        verification_status = 'banned',
        banned_at = now(),
        ban_reason = coalesce(p_reason, 'Direct administrative account ban.')
    where id = p_user_id;
    return jsonb_build_object('success', true, 'action', 'banned');
  end if;

  return jsonb_build_object('success', false, 'error', 'Invalid action');
end;
$$;

grant execute on function public.admin_issue_warning_or_ban(uuid, text, text) to authenticated, anon;

-- 7. STORAGE BUCKET FOR CALL RECORDINGS
insert into storage.buckets (id, name, public)
values ('deal_recordings', 'deal_recordings', true)
on conflict (id) do nothing;

drop policy if exists "Public and authenticated can upload deal recordings" on storage.objects;
create policy "Public and authenticated can upload deal recordings"
  on storage.objects for insert
  with check (bucket_id = 'deal_recordings');

drop policy if exists "Public and authenticated can read deal recordings" on storage.objects;
create policy "Public and authenticated can read deal recordings"
  on storage.objects for select
  using (bucket_id = 'deal_recordings');

notify pgrst, 'reload schema';
