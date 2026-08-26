---
name: supabase-schema-management
description: >-
  Procedures and safety guidelines for managing Supabase database tables, RLS policies,
  RPC functions, authentication, and migrations in EcoMatch.
---

# Supabase Schema & Data Management for EcoMatch

This skill provides step-by-step procedures for managing PostgreSQL schemas, RLS security policies, and real-time features in EcoMatch.

---

## 1. Core Tables Overview

- `products`: Material listings, condition, category, seller_id, price, specifications, status.
- `profiles`: User accounts, full_name, role (buyer/seller/admin), verification_status (verified/unverified).
- `deals`: Escrow transactions, deal_code, meeting location, timestamp, OTP verification dates, statuses.
- `deal_messages`: Chat messages with real-time subscriptions and moderation flags.
- `ownership_events`: Cryptographic SHA-256 hash-chained block records (`previous_hash`, `event_hash`).
- `product_offers`: Buyer offer negotiation records.

---

## 2. Safety Guidelines for Schema Modifications

1. **Non-Destructive Migrations:** Never execute `DROP TABLE` or rename active columns in production Supabase without backward-compatible view aliases.
2. **RLS (Row Level Security):** All new tables must have RLS enabled with explicit policies:
   - Read access for authenticated/public users according to visibility.
   - Write/Update access restricted to row owners (`auth.uid() = seller_id` or `auth.uid() = buyer_id`).
3. **RPC Functions:** Keep database RPC stored procedures idempotent (e.g., `generate_deal_exchange_code`, `verify_deal_exchange_code`).
4. **Environment Variables:**
   - Client uses: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - Admin scripts/MCP servers use `SUPABASE_SERVICE_ROLE_KEY` or direct Postgres connection string.
