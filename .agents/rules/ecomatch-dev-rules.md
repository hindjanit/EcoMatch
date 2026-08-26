# EcoMatch Development Rules

---

## Non-Negotiable Core Tenets

1. **Preserve Business Logic & APIs:**
   - Existing endpoints (`/api/ai/analyze-product`, `/api/ai/match`, `/api/identity/verify-aadhaar`, `/api/location/search`, `/api/chat/moderate`) must remain operational.
   - Do not remove or rename database columns in Supabase queries.

2. **Route Integrity:**
   - Never remove or orphan existing functional routes (`/`, `/marketplace`, `/ai-classify`, `/ai-match`, `/ledger`, `/deals/[id]`, `/seller/add-product`, `/buyer/dashboard`, `/seller/dashboard`, `/chat`, `/verify-identity`).

3. **High-Trust UI/UX Standard:**
   - Dark industrial aesthetic (`#07090E`, `#0C101A`, `#151C28`).
   - Unbundled trust signals: AI Match score, UIDAI Identity verification, On-site inspection, and Ledger hash proof must remain distinct.
   - Mobile touch targets must be >= 48px.
   - WCAG 2.1 AA contrast compliance for warehouse & sunlight readability.

4. **Verification Requirement:**
   - Run `npm run build` after changes to confirm TypeScript compiler passes with exit code 0.
