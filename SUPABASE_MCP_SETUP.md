# Supabase MCP Setup Guide for EcoMatch

Antigravity uses the Model Context Protocol (MCP) to interact directly with your Supabase database and schema.

---

## What Has Been Configured
A pre-configured MCP configuration file has been created at:
```
.agents/mcp_config.json
```

Your project URL is pre-filled:
`https://rgmajnxokkcjcrnzidrh.supabase.co`

---

## Action Required to Activate Supabase MCP

Choose either **Option 1 (Recommended)** or **Option 2**:

### Option 1: Supabase Service Role Key (Recommended)
1. Go to your **Supabase Dashboard**: [https://supabase.com/dashboard/project/rgmajnxokkcjcrnzidrh/settings/api](https://supabase.com/dashboard/project/rgmajnxokkcjcrnzidrh/settings/api)
2. Copy your **`service_role` secret key** (under Project Settings ➔ API ➔ Project API Keys).
3. Open `.agents/mcp_config.json` and replace `REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY` with your secret key.

---

### Option 2: Direct PostgreSQL Connection
1. Go to **Supabase Dashboard ➔ Project Settings ➔ Database ➔ Connection String (URI)**.
2. Open `.agents/mcp_config.json` and replace `REPLACE_WITH_DB_PASSWORD` in the `supabase-postgres` configuration with your actual database password.

---

## Verification
Once you add your key/password:
1. In Antigravity, open **Additional Options (...) ➔ MCP Servers** (or restart the agent session).
2. The agent will automatically gain access to tools for querying tables, checking schemas, inspecting migrations, and viewing real-time deal records.
