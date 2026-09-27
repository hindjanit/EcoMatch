-- Read-only deployment inspection. Contains no customer rows or secret values.
begin transaction read only;
select current_database() as database_name, current_user as database_role;
select name, installed_version from pg_available_extensions where name='pgcrypto';
select table_name,column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name in
('profiles','products','product_images','deal_requests','ownership_events','calls',
 'communication_risk_events','deal_disputes','deal_audit_logs','deal_notifications',
 'identity_sessions','listing_ai_reviews','delivery_tokens')
order by table_name,ordinal_position;
select c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('profiles','products','deal_requests','identity_sessions');
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
 p.prosecdef as security_definer,p.proacl as privileges
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like 'trust_%' or p.proname in
 ('complete_identity_verification','generate_deal_exchange_code','verify_deal_exchange_code','confirm_deal_handover'))
order by p.proname;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in('profiles','deal_requests','identity_sessions','listing_ai_reviews');
select event_object_table,trigger_name,action_statement from information_schema.triggers
where trigger_schema='public' and event_object_table in('profiles','products','deal_requests');
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id in('call-recordings-private','exchange-evidence','product-images');
rollback;
