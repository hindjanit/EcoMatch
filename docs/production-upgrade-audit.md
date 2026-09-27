# Production upgrade audit (27 September 2026)

## Existing dependency map

- Browser Supabase client → Auth, `profiles`, `products`, `product_images` and public listing storage. Seller uploads photos after inserting a pending product. Marketplace and AI Match filter approved products/images.
- Product/chat → `deal_requests` (not a `deals` table), `conversations`, `messages`, `product_offers`. Deal page calls SQL meeting, QR, OTP, proximity and completion functions.
- `GlobalCallingProvider` → WebRTC + Supabase broadcast signaling + `calls`, `deal_call_logs`, `communication_risk_events`. A second `DealRoomCallWidget` duplicates the recording implementation.
- Admin → product approval and call audits. `/admin/communications` also reads calls, reports and `deal_disputes`.
- Completion → existing `ownership_events` and `products.current_owner_id` / `sold_deal_id`. Notifications already use `deal_notifications`; timeline uses `deal_audit_logs`.
- AI routes → Gemini and optional SerpAPI. Existing classifier is rules based. Vision/matching silently fall back; those fallback results must never authorize approval or payout.
- Location → profile latitude/longitude and location search. Public profile lookups currently disclose exact coordinates; delivery addresses need a separate private record and public lookups need coarse values.

## Security findings driving the upgrade

1. Phase 17 makes `deal_recordings` public. Phase 14 permits public upload/read. Replace these policies and use signed authorized access.
2. Browser submits risk scores and product status. Database guards and server moderation must own these fields.
3. Legacy `confirm_deal_handover` completes both parties at once. Secure delivery must block this bypass; self pickup must require actual OTP and independent participant confirmation.
4. Calls accept arbitrary client transcript/role labels and infer the responsible party. Restriction requires authenticated evidence attribution; mixed/client audio must remain reviewable and cannot prove the other speaker's identity.
5. Existing permissive participant updates need column/state guards. Service role credentials must never reach a client bundle.

## Schema and environment boundary

Inspected all checked-in SQL phases and affected application flows. This repository has no canonical base migration for profiles/products and no database admin connection or service role key configured locally. Live schema introspection/application cannot be claimed. The additive migration includes prerequisite checks and must be tested against a staging copy before production use.

Existing configured key names: public Supabase URL/publishable key, Gemini, SerpAPI. No payment or Porter API credentials/documentation. Production adapters fail closed until configured. Demo transactions are explicitly labelled and cannot advance real transactions.

## Baseline gates

- TypeScript: passed before changes.
- Lint: 74 existing errors across older UI/API files, recorded privately in `.codex-baseline-lint.json`.
- Build: blocked before changes by fetching Geist fonts from Google. Use the existing cached Geist assets locally to make builds reproducible.

## Implementation boundaries

Retain existing URLs, self pickup, marketplace, classifier, matching, chat, dashboards and ownership table. Add a delivery state on `deal_requests`, private evidence/payments/quotes/returns, server-only orchestration, and a command center linked to the original review screens. Migration writes and external provider calls are separate from local code delivery.
