-- Phase 25: Run after phases 18, 19, 20, 23 and 24. This is additive and
-- idempotent. Trusted Vision evidence never accepts browser-written factors.
begin;
create table if not exists public.vision_condition_assessments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  assessment jsonb not null,
  clarification_questions jsonb not null default '[]'::jsonb,
  vision_model text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
alter table public.vision_condition_assessments enable row level security;
drop policy if exists vision_assessment_seller_read on public.vision_condition_assessments;
create policy vision_assessment_seller_read on public.vision_condition_assessments for select to authenticated using (seller_id = auth.uid());
revoke all on public.vision_condition_assessments from anon, authenticated;
grant select on public.vision_condition_assessments to authenticated;

alter table public.product_condition_disclosures
  add column if not exists vision_assessment_id uuid references public.vision_condition_assessments(id),
  add column if not exists seller_clarification_answers jsonb not null default '{}'::jsonb,
  add column if not exists system_condition_assessment jsonb,
  add column if not exists system_condition_factors jsonb not null default '[]'::jsonb,
  add column if not exists condition_evidence_provenance jsonb not null default '[]'::jsonb,
  add column if not exists system_condition_factor numeric check (system_condition_factor is null or (system_condition_factor > 0 and system_condition_factor <= 1)),
  add column if not exists condition_confidence integer check (condition_confidence between 0 and 100),
  add column if not exists condition_needs_review boolean not null default false;

-- Replace the Phase 23 direct client write policy. Writes now travel through a
-- route handler that authenticates the seller, reads the trusted Vision record,
-- validates bounded answers, then uses the service-role database client.
drop policy if exists condition_disclosure_seller_write on public.product_condition_disclosures;
revoke insert, update, delete on public.product_condition_disclosures from authenticated, anon;
grant select on public.product_condition_disclosures to authenticated;
grant all on public.product_condition_disclosures, public.vision_condition_assessments to service_role;
notify pgrst, 'reload schema';
commit;
