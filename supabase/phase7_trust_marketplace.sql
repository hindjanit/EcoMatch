-- EcoMatch Phase 7A: Trust, Offers, Chat Safety, Admin Risk Review
-- Run once in the SAME Supabase project used by .env.local.
-- Safe to run repeatedly where possible.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) PROFILE / IDENTITY TRUST FIELDS
-- =========================================================
alter table public.profiles
  add column if not exists identity_reference_hash text,
  add column if not exists identity_liveness_passed boolean not null default false,
  add column if not exists identity_face_match_score numeric,
  add column if not exists identity_verified_name text,
  add column if not exists trust_score integer not null default 0,
  add column if not exists verification_updated_at timestamptz;

-- Existing Phase 5 columns are reused:
-- verification_status, verification_method, verified_at


-- Free email verification friendly profile creation.
-- Supabase can require email confirmation without losing the profile row.
create or replace function public.handle_new_ecomatch_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, phone, role, verification_status)
  values(
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'role', '')), ''), 'buyer'),
    'unverified'
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = coalesce(excluded.role, public.profiles.role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ecomatch on auth.users;
create trigger on_auth_user_created_ecomatch
after insert on auth.users
for each row execute function public.handle_new_ecomatch_user();

-- =========================================================
-- 2) PRODUCT RISK REVIEW FIELDS
-- =========================================================
alter table public.products
  add column if not exists ai_review_bucket text not null default 'normal',
  add column if not exists ai_risk_score integer not null default 0,
  add column if not exists ai_risk_reasons text[] not null default '{}',
  add column if not exists admin_review_note text;

-- Keep risk values predictable without failing if an older constraint exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_ai_review_bucket_check'
  ) then
    alter table public.products
      add constraint products_ai_review_bucket_check
      check (ai_review_bucket in ('normal','review','likely_scam'));
  end if;
end $$;

-- =========================================================
-- 3) SERVER-SIDE LISTING TRUST GATE
-- Unverified: <= Rs 1000, <= 5 active, <= 15 created/month.
-- =========================================================
create or replace function public.enforce_listing_trust_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_active_count integer;
  v_month_count integer;
begin
  select coalesce(verification_status, 'unverified')
  into v_status
  from public.profiles
  where id = new.seller_id;

  v_status := coalesce(v_status, 'unverified');

  if v_status <> 'verified' then
    if coalesce(new.price, 0) > 1000 then
      raise exception 'IDENTITY_VERIFICATION_REQUIRED: Listings above Rs 1000 require EcoMatch Identity Verification.';
    end if;

    select count(*) into v_active_count
    from public.products
    where seller_id = new.seller_id
      and status in ('pending','approved');

    if v_active_count >= 5 then
      raise exception 'UNVERIFIED_ACTIVE_LIMIT: Unverified accounts can have at most 5 active listings.';
    end if;

    select count(*) into v_month_count
    from public.products
    where seller_id = new.seller_id
      and created_at >= date_trunc('month', now());

    if v_month_count >= 15 then
      raise exception 'UNVERIFIED_MONTHLY_LIMIT: Unverified accounts can create at most 15 listings per month.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_listing_trust_rules on public.products;
create trigger trg_enforce_listing_trust_rules
before insert on public.products
for each row execute function public.enforce_listing_trust_rules();

-- =========================================================
-- 4) NEGOTIATION / OFFERS
-- =========================================================
create table if not exists public.product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  offer_price numeric not null check (offer_price > 0),
  counter_price numeric,
  agreed_price numeric,
  status text not null default 'pending'
    check (status in ('pending','countered','accepted','rejected','cancelled')),
  last_action_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_buyer_not_seller check (buyer_id <> seller_id)
);

create index if not exists product_offers_product_idx on public.product_offers(product_id);
create index if not exists product_offers_buyer_idx on public.product_offers(buyer_id);
create index if not exists product_offers_seller_idx on public.product_offers(seller_id);

alter table public.product_offers enable row level security;

drop policy if exists "offer participants can view" on public.product_offers;
create policy "offer participants can view"
on public.product_offers for select to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyers can create offers" on public.product_offers;
create policy "buyers can create offers"
on public.product_offers for insert to authenticated
with check (auth.uid() = buyer_id and buyer_id <> seller_id);

drop policy if exists "offer participants can update" on public.product_offers;
create policy "offer participants can update"
on public.product_offers for update to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

alter table public.deal_requests
  add column if not exists agreed_price numeric,
  add column if not exists source_offer_id uuid references public.product_offers(id) on delete set null;

-- =========================================================
-- 5) CHAT SAFETY EVENTS + SAFE MESSAGE RPC
-- =========================================================
create table if not exists public.chat_safety_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  risk_level text not null default 'high' check (risk_level in ('medium','high')),
  created_at timestamptz not null default now()
);

create index if not exists chat_safety_events_conversation_idx on public.chat_safety_events(conversation_id);

alter table public.chat_safety_events enable row level security;

drop policy if exists "conversation participants can view safety events" on public.chat_safety_events;
create policy "conversation participants can view safety events"
on public.chat_safety_events for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

create or replace function public.send_safe_message(
  p_conversation_id bigint,
  p_message text,
  p_ai_flag boolean default false,
  p_ai_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.conversations%rowtype;
  clean_message text;
  violation_reason text := null;
  inserted_id bigint;
begin
  select * into c from public.conversations where id = p_conversation_id;
  if not found then
    raise exception 'Conversation not found';
  end if;

  if auth.uid() <> c.buyer_id and auth.uid() <> c.seller_id then
    raise exception 'Not a participant in this conversation';
  end if;

  clean_message := trim(coalesce(p_message, ''));
  if clean_message = '' then
    return jsonb_build_object('allowed', false, 'reason', 'Empty message');
  end if;

  if clean_message ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}' then
    violation_reason := 'Email address sharing detected';
  elsif clean_message ~* '(https?://|www\.|wa\.me|t\.me|instagram\.com|facebook\.com|snapchat\.com)' then
    violation_reason := 'External link or social platform redirect detected';
  elsif clean_message ~* '\m[6-9][0-9]{9}\M' then
    violation_reason := 'Phone number sharing detected';
  elsif clean_message ~* '(whats[ ]?app|telegram|insta(gram)?|snap(chat)?|call me|text me|dm me|outside (eco)?match|contact me)' then
    violation_reason := 'Attempt to move the conversation outside EcoMatch';
  elsif p_ai_flag then
    violation_reason := coalesce(nullif(trim(p_ai_reason), ''), 'AI detected an off-platform diversion attempt');
  end if;

  if violation_reason is not null then
    insert into public.chat_safety_events(conversation_id, sender_id, reason, risk_level)
    values(p_conversation_id, auth.uid(), violation_reason, 'high');

    return jsonb_build_object(
      'allowed', false,
      'reason', violation_reason,
      'warning', 'For safety, keep communication and payments inside EcoMatch.'
    );
  end if;

  insert into public.messages(conversation_id, sender_id, message)
  values(p_conversation_id, auth.uid(), clean_message)
  returning id into inserted_id;

  return jsonb_build_object('allowed', true, 'message_id', inserted_id);
end;
$$;

grant execute on function public.send_safe_message(bigint, text, boolean, text) to authenticated;

-- Force normal clients through the safety RPC instead of direct message inserts.
-- The SECURITY DEFINER function above can still insert after it performs checks.
revoke insert on public.messages from authenticated;
revoke insert on public.messages from anon;

-- =========================================================
-- 6) SAFE EXCHANGE SIMPLIFICATION
-- No trusted contact. No GPS check-in.
-- Both meeting confirmations directly unlock OTP exchange.
-- =========================================================
create or replace function public.set_deal_exchange_code(p_deal_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare d public.deal_requests%rowtype;
begin
  select * into d from public.deal_requests where id = p_deal_id;
  if not found then raise exception 'Deal not found'; end if;
  if auth.uid() <> d.seller_id then raise exception 'Only the seller can generate the exchange code'; end if;
  if d.status <> 'exchange_ready' then raise exception 'Both participants must confirm the meeting before generating the exchange code'; end if;
  if p_code !~ '^[0-9]{6}$' then raise exception 'Exchange code must be exactly six digits'; end if;

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

grant execute on function public.set_deal_exchange_code(uuid, text) to authenticated;

notify pgrst, 'reload schema';
