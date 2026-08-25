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
