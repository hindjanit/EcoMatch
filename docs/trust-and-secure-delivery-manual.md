# EcoMatch Production Trust & Secure Delivery Manual

## 1. Executive Summary & Architecture

This release upgrades EcoMatch with three industrial-grade trust pillars while strictly preserving pre-existing platform routes, schema compatibility, cryptographic UIDAI e-KYC signature checks, and SHA-256 provenance chain integrity:

1. **AI Trust-Based Automatic Listing Approval & Moderation Queue**:
   - Every listed product undergoes multimodal safety scoring (0–100) using Gemini Vision + server-side checks.
   - Deterministic policy enforces that high numeric safety scores **cannot override** hard safety flags (e.g. `RESTRICTED_ITEM_TEXT`, `SELLER_RESTRICTED`, hazardous waste, duplicate photo bytes).
   - Listings scoring $\ge 85$ without hard flags or failed checks are automatically approved (`approval_method = 'ai_auto'`). All others route safely to the administrative moderation queue (`/admin/trust`) with granular check breakdowns and actionable reasons.

2. **Safe, Recorded In-App Buyer ↔ Seller Audio with AI Diversion Detection**:
   - Dual-participant mutual consent is required before any recording session begins.
   - Audio is transmitted via WebRTC private signaling and archived into private encrypted storage (`call-recordings-private`) with 60-second time-limited signed URL access.
   - Diversion detection analyzes Hindi, English, and Hinglish transcripts for platform circumvention attempts (e.g., cash deals, WhatsApp/Telegram phone number exchange).
   - Unverified browser microphone audio attribution is flagged as unverified, preventing unauthorized automatic penalties against a counterparty.

3. **EcoMatch Secure Delivery Escrow & Provenance**:
   - Server-side fee calculation using integer paise (`productPaise`, `deliveryPaise`, 10% platform buffer `servicePaise`, refundable seller security deposit `depositPaise`).
   - Payment hold abstraction with strict state machine (`FULFILMENT_SELECTED` $\to$ `DELIVERY_QUOTED` $\to$ `BUYER_PAYMENT_PENDING` $\to$ `SELLER_DEPOSIT_PENDING` $\to$ `PICKUP_EVIDENCE_PENDING` $\to$ `DRIVER_ASSIGNED` $\to$ `IN_TRANSIT` $\to$ `DELIVERY_EVIDENCE_PENDING` $\to$ `BUYER_CONFIRMATION_PENDING` $\to$ `PAYMENT_RELEASE_PENDING` $\to$ `COMPLETED`).
   - Single-use 6-digit OTP and expiring tokens with inline SVG QR generation using the QR encoding library. Phase 19 repairs self-pickup QR verification and requires separate buyer and seller confirmations.
   - Tamper-evident SHA-256 ownership chaining linked directly into `ownership_events` on final settlement.
   - Dispute freeze protocol preventing settlement while disputes are active, supporting reviewed returns with partial or full seller security deposit adjustments.

---

## 2. Database Migration Deployment (`phase18_trust_secure_delivery.sql`)

### Prerequisites
- Supabase PostgreSQL instance with `pgcrypto` extension installed.
- Pre-existing Phase 1–17 tables (`products`, `profiles`, `deal_requests`, `ownership_events`, `calls`, `deal_disputes`, `deal_audit_logs`).

### Running the Migration
Inspect the existing schema with `supabase/deployment_preflight.sql`, then apply phase 18 followed by `supabase/phase19_identity_and_audit_repairs.sql` through the SQL Editor or your managed migration process. Validate against staging first. Do not rerun phase 19 if its identity sessions table already exists; inspect the deployed definitions first.

These files are outside `supabase/migrations/`, so `supabase db push` does not discover them automatically. See `docs/identity-and-audit-repairs.md` for phase 19 setup and test limits.

### Granted Table Privileges & RLS
- All new tables (`listing_ai_reviews`, `delivery_quotes`, `deliveries`, `payments`, `seller_security_deposits`, `exchange_evidence`, `delivery_tokens`, `delivery_returns`, `call_transcripts`, `call_recordings`, `trust_audit_logs`, `trust_idempotency`, `trust_rate_limits`) have RLS enabled.
- `authenticated` role is granted `SELECT` permissions governed by Deal participant (`trust_participant(deal_id)`) or Admin policies.
- Direct `INSERT`, `UPDATE`, and `DELETE` on trust tables are revoked from `anon` and `authenticated`; all modifications must pass through PostgreSQL security definer procedures (`trust_delivery_action`, `trust_publish_review`, `trust_issue_delivery_token`, `trust_verify_delivery_token`, `trust_call_action`, `trust_save_call_analysis`, `trust_admin_action`).

---

## 3. Real Provider Setup vs Demo Mode

### Demo Mode (Judge Presentations)
To demonstrate the complete lifecycle without actual bank charges or Porter drivers:
```env
ECOMATCH_DEMO_MODE=true
LOGISTICS_PROVIDER=mock
PAYMENT_PROVIDER=mock
```
- In Demo mode, actions are explicitly marked with `DEMO · no real payment or driver` badges.
- Demo tracking updates (`DRIVER_ASSIGNED`, `IN_TRANSIT`, `DELIVERY_EVIDENCE_PENDING`) and simulated payments can be executed safely through the UI.

### Production Mode (Fail Closed)
In production:
```env
ECOMATCH_DEMO_MODE=false
LOGISTICS_PROVIDER=porter # (or configured enterprise logistics adapter)
PAYMENT_PROVIDER=razorpay # (or configured verified payment provider)
```
- The codebase **fails closed**: no guessed endpoints or fake transactions occur.
- These provider names are intended configuration only: the current Porter adapter is a placeholder and no production payment adapter is implemented. Setting these variables alone does not activate an integration.
- If credentials or configurations are missing, clean 503/400 errors are returned to the user without platform crashes.

---

## 4. End-to-End Judge Walkthrough Script

### Step 1: Automated Listing Ingestion & AI Trust Review
1. Sign in as a Seller and navigate to `/seller/add-product`.
2. Fill in material details (e.g. "Industrial Grade Aluminum Scrap", Quantity: 500 kg, Price: ₹25,000) and upload photos.
3. Submit the listing.
4. If photos and details meet all safety standards, the listing is automatically published with `AI AUTO APPROVED` status and safety badge.
5. In `/seller/dashboard`, observe the listing inventory with `Safety: 92/100` badge and the `Re-check Safety` action.

### Step 2: Deal Initiation & Secure Delivery Selection
1. As a Buyer, browse to the product and initiate a Deal Room (`/deals/[id]`).
2. As the Seller, accept the deal.
3. Once accepted, the Buyer opens the **Safe Exchange Protocol** panel and clicks **EcoMatch Secure Delivery**.
4. Both Buyer and Seller confirm their respective delivery/pickup addresses.
5. Buyer clicks **Get delivery estimate** to review the transparent checkout breakdown (Product, Delivery estimate, 10% platform buffer, and Refundable Seller Security Deposit).

### Step 3: Payment Hold & Seller Security Deposit
1. Buyer clicks **Continue to payment** (or **DEMO: simulate verified payment** in demo mode).
2. Seller provides the refundable security deposit hold (e.g., ₹500).
3. Seller uploads pickup verification photos (3–5 photos + video).

### Step 4: Dispatch, Single-Use QR & 6-Digit OTP Handover
1. Seller books delivery pickup. In demo mode, advance tracking to `DRIVER_ASSIGNED`.
2. Seller generates single-use handover link & OTP. An inline SVG QR code renders immediately with a rotating 6-digit OTP.
3. Driver or counterparty verifies the OTP at `/delivery/verify#{token}`.
4. Advance transit to `DELIVERY_EVIDENCE_PENDING`. Buyer uploads delivery verification evidence.
5. Buyer generates handover delivery token and verifies counterparty OTP.

### Step 5: Dual Confirmation & Cryptographic Ledger Chaining
1. Buyer confirms receipt: **Product Received & Correct**.
2. Click **Complete settlement & ownership transfer**.
3. Funds are released to seller, the security deposit is refunded, and a new block is appended to `/ledger` with SHA-256 evidence hash chaining.

### Step 6: Dispute & Return Resolution Flow (Alternative Path)
1. If defective goods are received, click **Report a Problem** before final settlement.
2. Select problem reason (e.g., "Damaged Product") and submit. State transitions to `DISPUTED`, immediately freezing payouts.
3. Administrator visits `/admin/trust`, reviews disputes, and selects `return` with an approved buyer refund and partial seller deposit deduction.
4. Goods are returned and verified; admin settles the refund to conclude the state transition to `RETURNED`.

---

## 5. Automated Verification & Quality Assurance

To verify all test suites and security assertions:
```bash
# In-memory PGlite PostgreSQL & domain assertion test runner
node --import tsx --test tests/trust.test.ts

# Code quality and style lint check on trust modules
npx eslint src/lib/trust src/app/api/trust src/components/SecureDeliveryPanel.tsx src/components/TrustCenter.tsx src/components/GlobalCallingProvider.tsx src/components/DealRoomCallWidget.tsx src/app/admin/trust src/app/delivery tests/trust.test.ts

# Next.js production build verification
npm run build
```
