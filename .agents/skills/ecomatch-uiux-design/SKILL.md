---
name: ecomatch-uiux-design
description: >-
  Expert UI/UX design and frontend component development guidelines for EcoMatch.
  Use when designing or modifying user interfaces, components, deal rooms, trust badges,
  mobile flows, or visual themes for the circular material marketplace.
---

# EcoMatch UI/UX Design System & Guidelines

This skill provides design tokens, component architecture, and interaction patterns for building high-trust, conversion-focused, and auditable B2B circular marketplace interfaces.

---

## 1. Design Philosophy: Hybrid Archetype

EcoMatch balances two critical layers:
1. **The High-Velocity Marketplace Layer:** Simple, frictionless, high-contrast, sub-60-second camera capture and listing creation for plant managers and recycling scrap generators.
2. **The Auditable Industrial OS Layer:** Data-dense, precision-oriented, and cryptographically auditable for ESG managers, procurement officers, and compliance auditors.

---

## 2. Color Palette & Design Tokens

```css
/* Base Backgrounds */
--bg-canvas: #07090E;       /* Deepest charcoal foundation */
--bg-surface: #0C101A;      /* Primary card / bento surface */
--bg-elevated: #151C28;     /* Floating dropdowns, modals, popovers */
--border-subtle: rgba(255, 255, 255, 0.10);
--border-active: rgba(56, 189, 248, 0.40);

/* Functional Accents */
--accent-emerald: #10B981;  /* Trust, UIDAI KYC, Environmental Offset, Positive Handover */
--accent-sky: #38BDF8;      /* AI Vision, Telemetry, Optical Confidence, Tech Features */
--accent-indigo: #6366F1;   /* Blockchain Ledger, Protocol States, Secondary Actions */
--accent-amber: #F59E0B;    /* Alerts, Unverified State, Caution, Negotiations */
--accent-danger: #EF4444;   /* Dispute Freeze, Tamper Detection, Hazardous Block */
```

---

## 3. Unbundled Trust Signal System

Never combine distinct trust signals into a single generic "Verified" badge. Always present unbundled chips:
- 🤖 **AI Optical Match:** `AI Match: 94% (Grade A-)` (Visual estimate only)
- 🛡️ **Identity Verification:** `UIDAI KYC Verified` vs `Unverified Seller`
- 🔒 **Handover Protocol:** `On-Site OTP Inspection`
- ⛓️ **Provenance:** `SHA-256 Sealed`
- 🕒 **Inventory Freshness:** `Verified X days ago` (with 14-day stale decay alert)

---

## 4. Mobile & Shopfloor Usability Standards

1. **Touch Target Size:** Interactive elements (buttons, checkboxes, toggles, inputs) must be at least **48×48px** to support workers using gloves or one-handed mobile devices.
2. **High-Contrast Readability:** Meet **WCAG 2.1 AA** contrast ratios (>= 4.5:1 for body text) so listings are legible in outdoor yards and bright warehouse environments.
3. **Client-Side Compression:** Images captured via mobile camera must be compressed to `<800KB WebP` on the client canvas before transmission.
4. **Motion Safety:** Respect `prefers-reduced-motion` media queries; gracefully replace heavy 3D scroll animations with clean, static tab switches.

---

## 5. Standard Component Patterns

### Deal Room Escrow State Stepper
```
[1. Offer Accepted] ➔ [2. Funds in Escrow] ➔ [3. Safe Hub Scheduled] ➔ [4. Physical Inspection & OTP] ➔ [5. Provenance Minted]
```

### Anti-Coercion OTP Security
- Never reveal OTP codes over chat or phone.
- Buyer OTP verification must require completing the 3-point physical inspection checklist on-site.
