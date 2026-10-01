# EcoMatch — Circular Material Exchange Marketplace

EcoMatch is a hackathon prototype where organisations can exchange reusable, recyclable and industrial surplus materials.

## Problem Statement Alignment

> Build a marketplace where organizations can exchange reusable materials while AI classifies waste and blockchain ensures transparent ownership records.

EcoMatch now demonstrates all three parts:

- **Organisation material marketplace:** buy/sell flows, verified listings, filters and direct chat.
- **AI waste classification:** `/ai-classify` classifies a material description into a waste/material category and suggests a circular reuse route.
- **AI material matching:** `/ai-match` ranks approved marketplace listings against a buyer's natural-language requirement.
- **Blockchain ownership prototype:** `/ledger` builds a SHA-256 linked chain from approved marketplace records so each record includes the previous record hash and current hash.

## Important Prototype Note

The ownership ledger is a **hackathon blockchain prototype**. It demonstrates cryptographic chaining and tamper-evident ownership records in the browser. It is not a deployed decentralized network. A production version can persist the same ownership events to a permissioned blockchain or smart contract.

## Main Routes

- `/` — Home
- `/marketplace` — Browse reusable materials
- `/seller/add-product` — List material for verification
- `/ai-classify` — AI waste/material classification demo
- `/ai-match` — AI requirement matching
- `/ledger` — Blockchain-style ownership ledger
- `/admin` — Listing verification
- `/chat` and `/chat/inbox` — Buyer/seller communication

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL and Storage
- Web Crypto API (SHA-256) for the prototype ownership chain

## Run Locally

```bash
npm install
npm run dev
```

Add the same Supabase environment variables used by the existing project before running.

## Team

**High on Codes**

Janit Kumar Hind · Krish Tiwari · Jeetu Yadav · Yash Gautam

---

## Phase 7A Trust Marketplace
See `PHASE_SEVEN_A_TRUST_MARKETPLACE.md` and run `supabase/phase7_trust_marketplace.sql` before testing the new profile, offer, chat-safety, admin-risk and listing-gate features.

## Final Presentation Database Order

For an existing EcoMatch database that already has Phase 26, apply:

1. `supabase/phase27_final_stabilization.sql`

Phase 27 is the final compatibility/security patch for the presentation build. It:

- removes the legacy ₹1,000 Aadhaar hard gate so identity verification is optional unless a listing/deal explicitly requires it;
- fixes buyer/seller verification requirement mapping;
- adds optional deal-level identity/GST verification requests;
- exposes only safe public business trust fields (never GSTIN or Aadhaar details);
- makes OTP **or** QR a valid server-verified self-pickup handover method;
- keeps ownership transfer atomic/idempotent through `complete_secure_handover`;
- revokes browser execution of legacy self-pickup completion entrypoints;
- fixes the GST verification guard to deny direct client verification changes by default;
- fixes GST audit logging and public GST badges/filters.
- hardens offers/accepted-offer Deal Room creation and freezes authoritative deal pricing;
- hardens meeting/proximity evidence, chat creation/messages, admin bans and circularity certificate issuance.

Do not call a business "GST Verified" from format/checksum validation alone. The current build uses `manual_official_lookup`, and an authorised admin must approve the business before the verified badge appears.

### Verification model

EcoMatch remains an open marketplace. Identity and GST verification are optional trust signals unless a specific listing/deal locks them as a requirement. B2B status itself does **not** automatically require GST verification; sellers can explicitly choose `Require GST-verified business buyer` for a listing.
