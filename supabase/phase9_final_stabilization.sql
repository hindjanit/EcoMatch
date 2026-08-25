-- EcoMatch Phase 9 — Final Stabilization / schema alignment
-- Safe to run after Phase 8. Uses the profile column names already present in the live project.

alter table public.profiles
  add column if not exists verification_status text default 'unverified',
  add column if not exists verification_method text,
  add column if not exists verified_at timestamptz,
  add column if not exists identity_reference_hash text,
  add column if not exists identity_liveness_passed boolean not null default false,
  add column if not exists identity_face_match_score numeric,
  add column if not exists trust_score integer not null default 0,
  add column if not exists successful_deals integer not null default 0;

-- Normalize existing verified accounts to a sensible minimum trust score.
update public.profiles
set trust_score = greatest(coalesce(trust_score,0), 70)
where verification_status = 'verified';

-- Keep unverified values explicit.
update public.profiles
set verification_status = 'unverified'
where verification_status is null or btrim(verification_status) = '';

-- Useful integrity guard without breaking existing values.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.profiles'::regclass
      and conname='profiles_trust_score_range'
  ) then
    alter table public.profiles
      add constraint profiles_trust_score_range check (trust_score between 0 and 100) not valid;
  end if;
end $$;

-- Recreate trust refresh against the canonical verification_status field.
create or replace function public.refresh_ecomatch_trust_score(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_verified boolean := false;
  v_deals integer := 0;
  v_score integer := 0;
begin
  select coalesce(verification_status='verified',false)
    into v_verified
  from public.profiles
  where id=p_user_id;

  select count(*)
    into v_deals
  from public.deal_requests
  where status='completed'
    and (buyer_id=p_user_id or seller_id=p_user_id);

  v_score := least(100,
    (case when v_verified then 70 else 10 end)
    + least(25,v_deals*5)
  );

  update public.profiles
  set trust_score=v_score,
      successful_deals=v_deals
  where id=p_user_id;

  return v_score;
end;
$$;

grant execute on function public.refresh_ecomatch_trust_score(uuid) to authenticated;

notify pgrst, 'reload schema';
