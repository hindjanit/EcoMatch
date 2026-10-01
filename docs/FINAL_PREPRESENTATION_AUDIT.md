# EcoMatch Final Pre-Presentation Audit

This repository snapshot includes the final source-level stabilization pass after Phase 26.

## Apply before demo

Apply `supabase/phase27_final_stabilization.sql` after Phase 26 in the same Supabase project.

## Feature-by-feature audit status

- **Auth / profile:** existing Supabase auth retained; identity verification evidence remains server-managed. UIDAI offline eKYC is labelled as Aadhaar Verified; demo verification remains visibly labelled as demo.
- **Seller listing:** B2B mode and verified-buyer/GST-buyer preferences now persist to the product record. Legacy ₹1,000 Aadhaar hard gates are retired.
- **Marketplace / product details:** identity and GST trust are separate signals; GST-verified filter/badge uses safe public fields only.
- **Offers / negotiation:** offer identity and prices are immutable after creation; state transitions run through `trust_offer_action`; accepting an offer and creating its Deal Room happen in one server transaction; accepted price becomes the authoritative deal price.
- **Deals:** direct deal price is frozen to the authoritative listing price; accepted-offer deal price comes from the accepted offer. Optional identity/GST requests can be requested, declined and waived by the requester unless the listing locked the requirement.
- **Meeting / proximity:** meeting proposer identity is server-derived; changing the meeting invalidates stale OTP/QR/check-in evidence; both parties must check in near the saved meeting point and each other before final self-pickup completion.
- **OTP / QR handover:** OTP or QR can independently satisfy the server-verified handover gate. QR remains deal-bound, expiring and single-use. Final handover also requires recent verification, proximity, both confirmations and any locked trust requirements.
- **Ownership ledger:** `complete_secure_handover` is the authoritative self-pickup finalizer; product owner change, deal completion and ownership event are atomic/idempotent. The global hash chain is serialized to avoid concurrent forks.
- **Chat:** direct message insert is revoked; browser sends use the anti-circumvention `send_safe_message` RPC. Conversation creation is checked against the approved product and actual seller/buyer.
- **Admin / Trust Center:** listing moderation and GST review use protected server paths. Admin ban/warning no longer mutates KYC verification state; it uses account security fields and logs the action.
- **Calls / recordings:** legacy public recording storage policies are superseded by the private Phase 18 storage guard. The admin call simulation remains an explicitly labelled demo-only UI simulation.
- **Delivery / webhook:** possession-based delivery-token verification is format checked and rate limited; Shiprocket webhook mutations fail closed unless the configured webhook token matches.
- **Circularity certificate:** certificate data is grounded in an authenticated completed deal plus ownership event. Client-supplied identities/weight cannot forge the certificate, and UI no longer claims statutory CPCB/EPR issuance.
- **AI listing / matching / pricing:** server AI paths retain authentication, input limits/timeouts where applicable, and fail closed for trust decisions. AI shipment weight remains advisory evidence, not ownership authority.
- **Location:** location search input is bounded and upstream lookup now has an 8-second timeout; no fake default meeting coordinates are inserted when geocoding fails.
- **Secrets / config:** `.env.example` contains variable names/placeholders only; no actual `.env` or private keys are included in the final ZIP.

## High-impact fixes in Phase 27

- Removed legacy client and database ₹1,000 Aadhaar hard gates; normal unverified trading remains allowed.
- Persisted seller listing trust preferences (`b2b_only`, identity preference/requirement, optional GST-verified buyer requirement).
- Fixed Phase 26 buyer/seller verification requirement mapping.
- Added deal-room identity/GST verification request, decline and optional waive/continue workflow.
- Added safe public business trust fields and separate GST-verified marketplace badge/filter.
- Made business verification fail closed and kept GSTIN/private verification fields out of `public_profiles`.
- Moved GST verification audit events to `trust_audit_logs` (the deal audit table requires a real deal id).
- Fixed self-pickup completion so a server-verified OTP **or** QR can satisfy handover verification.
- Made the product ownership guard recognise only trusted handover transactions; browser ownership writes remain blocked.
- Kept final self-pickup ownership transfer in one atomic/idempotent `complete_secure_handover` path and revoked browser execution of legacy completion entrypoints.
- Serialized the global ownership-event hash chain to avoid concurrent chain forks.
- Hardened offer acceptance and accepted-offer Deal Room creation into one authoritative transaction.
- Froze deal price/source-offer fields after creation.
- Hardened meeting/proximity evidence and removed fallback coordinates.
- Hardened EPR/circularity certificate generation and corrected statutory wording.
- Closed direct chat-message insertion regression and added conversation identity checks.
- Fixed admin ban compatibility with newer identity/KYC guards.
- Removed a duplicate profile load and updated obsolete UI copy that still claimed Aadhaar was mandatory above ₹1,000.

## Static validation performed on this snapshot

- ZIP/source tree inspected and key application/migration/test files present.
- 120 JS/TS/TSX/MJS source files checked for local imports: **0 missing local imports**.
- Merge conflict marker scan: **none found**.
- Credential/private-key pattern scan: **no actual key material found**.
- Sensitive debug-log pattern scan for password/token/OTP/Aadhaar/GSTIN: **none found**.
- TypeScript parse pass with the global compiler produced **no syntax diagnostics**. It stops on TS2688 because this container does not have the project's dependency type packages installed.

## Validation limitations in this container

The supplied archive did not contain a complete dependency installation. A dependency restore attempt could not complete in this runtime, so a dependency-complete `npm run build` / `npx tsc --noEmit` could not be rerun after these final edits. The previous source snapshot reportedly passed those commands on the development host, but this audit does **not** claim the modified snapshot has a live build PASS.

No target Supabase credentials/test database are available here. Therefore live migration execution, RLS attack tests, OTP/QR replay tests and full end-to-end ownership transfer must be run after applying Phase 27 to the target database.

Do not claim a live security test PASS from this file alone.
