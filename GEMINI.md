# EcoMatch Development Rules & Guidelines

These workspace rules govern all development, refactoring, and UI/UX work in the EcoMatch project. Follow these guidelines strictly.

---

## 1. Preserve Existing Backend & Business Logic
- **No Unnecessary Refactoring:** Do not rewrite, alter, or remove working API routes, cryptographic verification logic, Gemini AI prompt pipelines, or state machines unless explicitly requested.
- **Maintain Cryptographic Integrity:** 
  - The UIDAI RSA-SHA256 e-KYC signature verification in `/api/identity/verify-aadhaar` must remain cryptographically authentic.
  - The SHA-256 hash chaining in `/ledger` and Supabase `ownership_events` must remain mathematically linked (`previous_hash` ➔ `event_hash`).
- **Protect Escrow State Machine:** The deal room status lifecycle (`requested` ➔ `accepted` ➔ `exchange_ready` ➔ `completed`) and OTP release protocols must not be broken or simplified into insecure shortcuts.

---

## 2. Supabase Integration Invariance
- **Preserve Existing Tables & Schema:** Do not drop, alter column names, or break relations in Supabase tables (`products`, `profiles`, `deals`, `deal_messages`, `ownership_events`, `product_offers`).
- **Preserve RLS Policies & Storage:** Supabase Auth and Storage bucket bindings (`products`, `deals`, `avatars`) must remain functional.
- **Graceful Fallbacks:** Always handle network errors and missing API keys gracefully with clear user feedback rather than blank crashes.

---

## 3. Route & Feature Permanence
- **Do Not Delete or Break Existing Routes:**
  - `/` (Home)
  - `/marketplace` (Browse Lots & Filter)
  - `/ai-classify` (Gemini Optical Scanner & Defect Grading)
  - `/ai-match` (Natural-Language Requisition Matcher)
  - `/ledger` (Auditable Provenance Ledger)
  - `/deals` and `/deals/[id]` (Escrow Deal Rooms)
  - `/seller/add-product` (Material Ingestion)
  - `/buyer/dashboard` & `/seller/dashboard` (User Dashboards)
  - `/chat` & `/chat/inbox` (Live Messaging with Moderation)
  - `/verify-identity` (UIDAI Offline e-KYC Verification)
  - `/profile` and `/offers` (Trust Profile & Negotiations)

---

## 4. Professional, Accessible & Responsive UI/UX
- **WCAG 2.1 AA Standards:** Maintain high contrast text ratios (minimum 4.5:1) for readability in bright sunlight and warehouse environments.
- **Mobile-First & Glove-Friendly:** Minimum touch target size of **48×48px** for all interactive buttons, toggles, and inputs.
- **Visual Archetype:** Maintain the high-trust dark cyber-industrial visual identity (`#07090E`, `#0C101A`, `#151C28`) with electric emerald (`#10B981`), sky cyan (`#38BDF8`), and amber alert (`#F59E0B`) accents. Avoid excessive decorative glow on operational surfaces.
- **Transparent Trust Chips:** Never combine distinct trust signals into a generic "verified" badge. Keep `AI Optical Match`, `UIDAI Verified`, `On-Site Inspection`, `SHA-256 Sealed`, and `Freshness` unbundled.

---

## 5. Incremental Changes & Reversibility
- **Single-Responsibility Edits:** Make isolated, focused changes rather than sweeping cross-codebase rewrites.
- **Clean Git Diffs:** Keep edits formatted cleanly and preserve unrelated comments, imports, and docstrings.
- **Easy Rollback:** Ensure every UI or component addition can be cleanly disabled or reverted without breaking dependencies.

---

## 6. Mandatory Quality Verification
- **Run Type Checks & Build Verification:** After every significant code or component change, execute:
  ```bash
  npm run build
  ```
  Ensure exit code is `0` and all static/dynamic routes generate without TypeScript errors.
