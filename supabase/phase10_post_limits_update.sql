-- EcoMatch Phase 10 — Update Listing Limits & Caps
-- Unverified accounts: <= Rs 10,000 price cap, <= 30 active listings.
-- Verified accounts: <= 300 active listings, unlimited price.

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

notify pgrst, 'reload schema';
