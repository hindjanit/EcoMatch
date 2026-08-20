# Changes made for the hackathon problem statement

Problem statement: **Build a marketplace where organizations can exchange reusable materials while AI classifies waste and blockchain ensures transparent ownership records.**

## Added

1. **AI Waste Classifier** — `/ai-classify`
   - Accepts a natural-language waste/surplus description.
   - Classifies it into EcoMatch material categories.
   - Displays confidence and a suggested reuse/recycling route.

2. **Blockchain Ownership Ledger Prototype** — `/ledger`
   - Reads approved marketplace products.
   - Creates linked SHA-256 records.
   - Each record shows product/material, owner organisation ID, previous hash and current hash.
   - Demonstrates tamper-evident chaining without requiring paid blockchain infrastructure.

3. **Problem-statement UI alignment**
   - Homepage now explicitly highlights AI waste classification and blockchain ownership records.
   - Product details link to ownership verification.
   - Existing marketplace, admin verification, AI matching and chat flows remain unchanged.

## No database migration required

The new demo features use the existing `products` records, so the current Supabase database can continue to work without adding tables.

## Production upgrade path

For a real deployment, replace the browser-generated ledger with persisted ownership-transfer events on a permissioned blockchain or smart contract, and replace the rule-based classifier with a trained/API-backed ML model.
