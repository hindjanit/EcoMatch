-- EcoMatch Phase 11 — Aadhaar Trust Limits (Rs 1,000 Cap for Unverified Users)
-- Unverified accounts: <= Rs 1,000 price cap for selling, <= 30 active listings.
-- Buying or selling > Rs 1,000 requires Aadhaar verification.
-- Verified accounts: <= 300 active listings, unlimited price for buying and selling.

-- 1. Seller Listing Rules Trigger
create or replace function public.enforce_listing_trust_rules()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_status text;
  v_active_count integer;
begin
  select coalesce(verification_status, 'unverified')
    into v_status
  from public.profiles
  where id = new.seller_id;

  v_status := coalesce(v_status, 'unverified');

  if v_status <> 'verified' then
    -- Price limit for unverified sellers: Rs 1,000
    if coalesce(new.price, 0) > 1000 then
      raise exception 'IDENTITY_VERIFICATION_REQUIRED: Listings above Rs 1,000 require EcoMatch Aadhaar Identity Verification.';
    end if;

    -- Active listings limit for unverified sellers: 30
    select count(*)
      into v_active_count
    from public.products
    where seller_id = new.seller_id
      and status in ('pending', 'approved');

    if v_active_count >= 30 then
      raise exception 'UNVERIFIED_ACTIVE_LIMIT: Unverified accounts can have at most 30 active listings.';
    end if;
  else
    -- Active listings limit for verified sellers: 300
    select count(*)
      into v_active_count
    from public.products
    where seller_id = new.seller_id
      and status in ('pending', 'approved');

    if v_active_count >= 300 then
      raise exception 'VERIFIED_ACTIVE_LIMIT: Verified accounts can have at most 300 active listings.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_listing_trust_rules on public.products;
create trigger trg_enforce_listing_trust_rules
  before insert on public.products
  for each row
  execute function public.enforce_listing_trust_rules();

-- 2. Buyer Deal Creation Rules Trigger (Buying > Rs 1,000 requires Aadhaar Verification)
create or replace function public.enforce_deal_trust_rules()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_buyer_status text;
  v_product_price numeric;
begin
  -- Get buyer status
  select coalesce(verification_status, 'unverified')
    into v_buyer_status
  from public.profiles
  where id = new.buyer_id;

  -- Get product price
  select coalesce(price, 0)
    into v_product_price
  from public.products
  where id = new.product_id;

  if coalesce(v_buyer_status, 'unverified') <> 'verified' and v_product_price > 1000 then
    raise exception 'IDENTITY_VERIFICATION_REQUIRED: Purchasing products above Rs 1,000 requires EcoMatch Aadhaar Identity Verification.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_deal_trust_rules on public.deal_requests;
create trigger trg_enforce_deal_trust_rules
  before insert on public.deal_requests
  for each row
  execute function public.enforce_deal_trust_rules();

-- 3. Buyer Offer Rules Trigger (Offers > Rs 1,000 require Aadhaar Verification)
create or replace function public.enforce_offer_trust_rules()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_buyer_status text;
begin
  select coalesce(verification_status, 'unverified')
    into v_buyer_status
  from public.profiles
  where id = new.buyer_id;

  if coalesce(v_buyer_status, 'unverified') <> 'verified' and coalesce(new.offer_price, 0) > 1000 then
    raise exception 'IDENTITY_VERIFICATION_REQUIRED: Making offers above Rs 1,000 requires EcoMatch Aadhaar Identity Verification.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_offer_trust_rules on public.product_offers;
create trigger trg_enforce_offer_trust_rules
  before insert on public.product_offers
  for each row
  execute function public.enforce_offer_trust_rules();
