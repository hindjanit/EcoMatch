-- Read-only Phase 20 moderation diagnostic.
-- Replace the title predicate with a product id when investigating a specific listing.

-- 1. Verify that the Phase 20 columns and authoritative publish RPC exist.
select
  to_regprocedure('public.trust_publish_review(bigint,integer,jsonb,text[])') as publish_review_rpc,
  to_regclass('public.listing_ai_reviews') as review_table,
  array_agg(column_name order by column_name) filter (
    where column_name in (
      'auto_approved', 'manual_review_required', 'moderation_decision',
      'moderation_risk_level', 'moderation_confidence', 'moderated_at'
    )
  ) as phase20_product_columns
from information_schema.columns
where table_schema = 'public' and table_name = 'products';

-- 2. Inspect each authoritative gate and the latest persisted AI result.
select
  p.id,
  p.title,
  p.status as product_status,
  p.safety_score,
  p.approval_method,
  p.auto_approved,
  p.manual_review_required,
  p.moderation_decision,
  p.moderation_risk_level,
  p.moderation_confidence,
  pr.verification_status as seller_verification_status,
  pr.account_status as seller_account_status,
  coalesce(pr.is_banned, false) as seller_is_banned,
  r.score as latest_ai_score,
  r.risk_level as latest_ai_risk_level,
  r.recommendation as latest_ai_recommendation,
  r.uncertain as latest_ai_uncertain,
  r.hard_flags as latest_ai_hard_flags,
  r.reasons as latest_ai_reasons,
  r.created_at as latest_ai_reviewed_at
from public.products p
left join public.profiles pr on pr.id = p.seller_id
left join lateral (
  select score, risk_level, recommendation, uncertain, hard_flags, reasons, created_at
  from public.listing_ai_reviews
  where product_id = p.id
  order by created_at desc, id desc
  limit 1
) r on true
where p.title ilike '%thermos%'
order by p.created_at desc;
