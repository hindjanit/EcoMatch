-- EcoMatch Phase 20: Real Shiprocket Logistics Integration & Deterministic AI Safe Auto-Approval
-- Compatible with all previous migrations (Phases 1 through 19).
-- Idempotent, non-destructive, safe to run multiple times.

begin;

-- ==============================================================================
-- 1. REAL SHIPROCKET & LOGISTICS COLUMNS
-- ==============================================================================

-- Enhance public.deliveries to store real carrier and tracking data
alter table public.deliveries
  add column if not exists shiprocket_order_id text,
  add column if not exists shiprocket_shipment_id text,
  add column if not exists awb_code text,
  add column if not exists courier_company_id text,
  add column if not exists courier_name text,
  add column if not exists pickup_status text,
  add column if not exists tracking_status text,
  add column if not exists tracking_payload jsonb default '{}'::jsonb,
  add column if not exists label_url text,
  add column if not exists manifest_url text,
  add column if not exists carrier_cost_paise bigint default 0,
  add column if not exists service_margin_paise bigint default 0,
  add column if not exists customer_delivery_paise bigint default 0,
  add column if not exists weight_kg numeric(8,3),
  add column if not exists length_cm numeric(8,2),
  add column if not exists breadth_cm numeric(8,2),
  add column if not exists height_cm numeric(8,2),
  add column if not exists pickup_scheduled_date timestamptz,
  add column if not exists last_tracking_sync_at timestamptz,
  add column if not exists error_code text,
  add column if not exists error_message text;

-- Indexes for performance and lookup
create index if not exists idx_deliveries_shiprocket_order on public.deliveries(shiprocket_order_id) where shiprocket_order_id is not null;
create index if not exists idx_deliveries_awb_code on public.deliveries(awb_code) where awb_code is not null;
create index if not exists idx_deliveries_shipment_id on public.deliveries(shiprocket_shipment_id) where shiprocket_shipment_id is not null;

-- ==============================================================================
-- 2. AI AUTO-APPROVAL & DETERMINISTIC MODERATION AUDITING
-- ==============================================================================

-- Enhance products table with explicit auto-approval audit fields
alter table public.products
  add column if not exists auto_approved boolean default false,
  add column if not exists manual_review_required boolean default false,
  add column if not exists moderation_decision text check(moderation_decision in ('auto_approve', 'manual_review', 'reject', 'suspended')),
  add column if not exists moderation_risk_level text check(moderation_risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  add column if not exists moderation_confidence numeric(4,3),
  add column if not exists moderation_reasons jsonb default '[]'::jsonb,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by text default 'ai_moderator';

create index if not exists idx_products_moderation_decision on public.products(moderation_decision);
create index if not exists idx_products_auto_approved on public.products(auto_approved);

-- ==============================================================================
-- 3. UPGRADED ATOMIC RPC FUNCTION: trust_publish_review
-- ==============================================================================
-- Replaces previous trust_publish_review to enforce deterministic multi-layer verification:
-- 1. Version check & product locking
-- 2. Evaluates score, recommendation, risk level, hard flags, and uncertain flag
-- 3. Sets auto_approved = true and status = 'approved' when safe
-- 4. Otherwise sets manual_review_required = true and status = 'pending_review'
-- 5. Commits audit log and notifies seller

create or replace function public.trust_publish_review(
  p_product bigint,
  p_version integer,
  p_review jsonb,
  p_hashes text[]
) returns text language plpgsql security definer set search_path=public as $$
declare
  p products%rowtype;
  s text;
  v_score integer;
  v_risk_level text;
  v_recommendation text;
  v_uncertain boolean;
  v_hard_flags_count integer;
  v_confidence numeric;
  v_is_auto_approved boolean;
begin
  select * into p from products where id = p_product for update;
  if not found then
    raise exception 'Product not found';
  end if;

  if p.moderation_version <> p_version or p.status not in ('pending', 'pending_review', 'changes_requested') then
    raise exception 'Listing changed or already finalized. Re-run analysis.';
  end if;

  v_score := coalesce((p_review->>'score')::integer, 0);
  v_risk_level := coalesce(p_review->>'riskLevel', 'HIGH');
  v_recommendation := coalesce(p_review->>'recommendation', 'ADMIN_REVIEW');
  v_uncertain := coalesce((p_review->>'uncertain')::boolean, true);
  v_hard_flags_count := jsonb_array_length(coalesce(p_review->'hardFlags', '[]'::jsonb));
  v_confidence := coalesce((p_review->>'confidence')::numeric, (v_score::numeric / 100.0));

  -- Deterministic auto-approval gating rule:
  -- Score >= 80, not uncertain, 0 hard flags, recommendation = AUTO_APPROVE, riskLevel = LOW
  if v_score >= 80 and not v_uncertain and v_hard_flags_count = 0 and v_recommendation = 'AUTO_APPROVE' and v_risk_level = 'LOW' then
    s := 'approved';
    v_is_auto_approved := true;
  else
    s := 'pending_review';
    v_is_auto_approved := false;
  end if;

  -- 1. Insert into listing_ai_reviews
  insert into listing_ai_reviews (
    product_id, seller_id, version, score, risk_level, recommendation,
    hard_flags, checks, reasons, uncertain, source, image_hashes
  ) values (
    p.id, p.seller_id, p_version, v_score, v_risk_level, v_recommendation,
    coalesce(p_review->'hardFlags', '[]'::jsonb),
    coalesce(p_review->'checks', '{}'::jsonb),
    coalesce(p_review->'reasons', '[]'::jsonb),
    v_uncertain,
    coalesce(p_review->>'source', 'unknown'),
    p_hashes
  )
  on conflict (product_id, version) do update set
    score = excluded.score,
    risk_level = excluded.risk_level,
    recommendation = excluded.recommendation,
    hard_flags = excluded.hard_flags,
    checks = excluded.checks,
    reasons = excluded.reasons,
    uncertain = excluded.uncertain,
    source = excluded.source,
    image_hashes = excluded.image_hashes;

  -- 2. Update product status and metadata
  update products set
    status = s,
    safety_score = v_score,
    approval_method = case when v_is_auto_approved then 'ai_auto' else null end,
    approved_at = case when v_is_auto_approved then now() else null end,
    auto_approved = v_is_auto_approved,
    manual_review_required = not v_is_auto_approved,
    moderation_decision = case when v_is_auto_approved then 'auto_approve' else 'manual_review' end,
    moderation_risk_level = v_risk_level,
    moderation_confidence = v_confidence,
    moderation_reasons = coalesce(p_review->'reasons', '[]'::jsonb),
    moderated_at = now(),
    moderated_by = 'ai_moderator'
  where id = p.id;

  -- 3. Update image verification status
  update product_images
  set verification_status = case when s = 'approved' then 'approved' else 'pending' end
  where product_id = p.id;

  -- 4. Audit trail
  insert into trust_audit_logs (entity_type, entity_id, action, details)
  values ('listing', p.id::text, s, jsonb_build_object(
    'review', p_review,
    'auto_approved', v_is_auto_approved,
    'score', v_score,
    'riskLevel', v_risk_level
  ));

  -- 5. Notification to seller
  insert into deal_notifications (user_id, type, title, message, action_url)
  values (
    p.seller_id,
    'LISTING_REVIEW',
    case when s = 'approved' then '✓ Listing auto-approved and published' else '⏳ Listing awaiting admin review' end,
    case when s = 'approved'
      then 'Your material passed AI safety and verification checks and is now live on the marketplace.'
      else 'Your listing requires quick administrative review. You can inspect its status in your dashboard.'
    end,
    '/seller/dashboard'
  );

  return s;
end;
$$;

revoke all on function trust_publish_review(bigint, integer, jsonb, text[]) from public, anon, authenticated;
grant execute on function trust_publish_review(bigint, integer, jsonb, text[]) to service_role;

-- ==============================================================================
-- 4. UPDATE DELIVERIES RLS
-- ==============================================================================
-- Allow participants (buyer and seller) or admin to read their delivery and tracking info
drop policy if exists trust_read on public.deliveries;
create policy trust_read on public.deliveries for select to authenticated
  using (public.trust_participant(deal_id));

commit;
