-- Read-only Phase 18 secure-calling diagnostic for Supabase SQL Editor.
-- It changes no data, policies, publications, functions, or schema.
with required_tables(name) as (
  values ('calls'), ('profiles'), ('communication_risk_events'), ('call_recordings'), ('call_transcripts')
), required_columns(table_name, column_name) as (
  values
    ('calls', 'id'), ('calls', 'caller_id'), ('calls', 'receiver_id'), ('calls', 'status'), ('calls', 'recording_consent'),
    ('profiles', 'account_status')
), required_functions(name, identity_arguments) as (
  values
    ('trust_call_action', 'p_actor uuid, p_action text, p_call uuid, p_data jsonb'),
    ('trust_active', 'p_user uuid')
), required_policies(schema_name, table_name, policyname) as (
  values ('public', 'calls', 'trust_admin_calls'), ('realtime', 'messages', 'trust_signal_receive'), ('realtime', 'messages', 'trust_signal_send')
)
select 'table' as object_type, name as object_name,
  case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = name) then 'READY' else 'MISSING' end as status
from required_tables
union all
select 'column', table_name || '.' || column_name,
  case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = required_columns.table_name and column_name = required_columns.column_name) then 'READY' else 'MISSING' end
from required_columns
union all
select 'function', name || '(' || identity_arguments || ')',
  case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = required_functions.name and pg_get_function_identity_arguments(p.oid) = required_functions.identity_arguments) then 'READY' else 'MISSING' end
from required_functions
union all
select 'policy', schema_name || '.' || table_name || '.' || policyname,
  case when exists (select 1 from pg_policies where schemaname = required_policies.schema_name and tablename = required_policies.table_name and policyname = required_policies.policyname) then 'READY' else 'MISSING' end
from required_policies
union all
select 'realtime', 'realtime.messages broadcast RLS',
  case when exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname in ('trust_signal_receive', 'trust_signal_send')) then 'READY' else 'MISSING' end;
