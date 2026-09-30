-- Seller declarations remain distinct from AI visual assessments.
begin;
create table if not exists public.product_condition_disclosures (
  product_id bigint primary key references public.products(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  usage_band text not null check (usage_band in ('never','lt_1_month','1_6_months','6_12_months','1_2_years','2_5_years','5_plus')),
  usage_months integer check (usage_months is null or usage_months >= 0),
  known_issue_status text not null check (known_issue_status in ('yes','no','not_sure')),
  defects jsonb not null default '[]'::jsonb,
  other_details text,
  refurbished text not null default 'not_applicable' check (refurbished in ('yes','no','unknown','not_applicable')),
  repaired text not null default 'unknown' check (repaired in ('yes','no','unknown')),
  repair_details text,
  overall_condition text,
  overall_condition_reason text,
  reuse_potential text,
  reuse_potential_reason text,
  seller_attested_at timestamptz not null default now(),
  disclosure_version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.product_condition_disclosures add column if not exists overall_condition text;
alter table public.product_condition_disclosures add column if not exists overall_condition_reason text;
alter table public.product_condition_disclosures add column if not exists reuse_potential text;
alter table public.product_condition_disclosures add column if not exists reuse_potential_reason text;
alter table public.product_condition_disclosures enable row level security;
drop policy if exists condition_disclosure_read on public.product_condition_disclosures;
drop policy if exists condition_disclosure_seller_write on public.product_condition_disclosures;
create policy condition_disclosure_read on public.product_condition_disclosures for select to authenticated using (true);
create policy condition_disclosure_seller_write on public.product_condition_disclosures for all to authenticated using (
  seller_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid())
) with check (
  seller_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid())
);

-- Buyer confirmation is server-side only. A mismatch freezes the existing handover flow.
alter table public.deal_requests add column if not exists buyer_disclosure_confirmation text check (buyer_disclosure_confirmation in ('matches','does_not_match'));
alter table public.deal_requests add column if not exists buyer_disclosure_confirmed_at timestamptz;
alter table public.deal_requests add column if not exists disclosure_version_confirmed integer;
alter table public.deal_requests add column if not exists condition_dispute_reason text;
alter table public.deal_requests add column if not exists condition_dispute_notes text;

create or replace function public.trust_confirm_condition_disclosure(p_deal_id uuid, p_matches boolean, p_reason text default null, p_notes text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.deal_requests%rowtype; disclosure_version_value integer;
begin
 select * into d from public.deal_requests where id=p_deal_id for update;
 if not found then raise exception 'Deal not found'; end if;
 if auth.uid() <> d.buyer_id then raise exception 'Only the buyer can confirm the disclosed condition'; end if;
 if d.is_disputed then raise exception 'This deal is already under review'; end if;
 select disclosure_version into disclosure_version_value from public.product_condition_disclosures where product_id=d.product_id;
 if disclosure_version_value is null then return jsonb_build_object('ok',true,'required',false); end if;
 if p_matches then
   update public.deal_requests set buyer_disclosure_confirmation='matches',buyer_disclosure_confirmed_at=now(),disclosure_version_confirmed=disclosure_version_value,condition_dispute_reason=null,condition_dispute_notes=null where id=d.id;
   return jsonb_build_object('ok',true,'required',true,'status','confirmed','version',disclosure_version_value);
 end if;
 if coalesce(trim(p_reason),'')='' then raise exception 'Select what differs from the seller disclosure'; end if;
 update public.deal_requests set buyer_disclosure_confirmation='does_not_match',buyer_disclosure_confirmed_at=now(),disclosure_version_confirmed=disclosure_version_value,condition_dispute_reason=left(p_reason,120),condition_dispute_notes=left(coalesce(p_notes,''),2000),is_disputed=true where id=d.id;
 insert into public.trust_audit_logs(actor_id,action,entity_id,details) values(auth.uid(),'condition_dispute',d.id,jsonb_build_object('reason',left(p_reason,120),'disclosure_version',disclosure_version_value));
 return jsonb_build_object('ok',true,'required',true,'status','condition_dispute');
end $$;
revoke all on function public.trust_confirm_condition_disclosure(uuid,boolean,text,text) from public,anon;
grant execute on function public.trust_confirm_condition_disclosure(uuid,boolean,text,text) to authenticated;

create or replace function public.trust_require_current_disclosure_confirmation() returns trigger language plpgsql security definer set search_path=public as $$
declare v integer;
begin
 if new.is_disputed then return new; end if;
 if new.buyer_handover_confirmed_at is not null and old.buyer_handover_confirmed_at is null then
   select disclosure_version into v from public.product_condition_disclosures where product_id=new.product_id;
   if v is not null and (new.buyer_disclosure_confirmation <> 'matches' or new.disclosure_version_confirmed <> v) then raise exception 'Buyer must confirm the current seller condition disclosure before handover'; end if;
 end if;
 return new;
end $$;
drop trigger if exists trust_require_current_disclosure_confirmation on public.deal_requests;
create trigger trust_require_current_disclosure_confirmation before update on public.deal_requests for each row execute function public.trust_require_current_disclosure_confirmation();
commit;
