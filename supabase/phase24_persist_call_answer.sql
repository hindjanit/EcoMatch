-- EcoMatch Phase 24: durable answer delivery if a private Realtime broadcast is delayed.
begin;
alter table public.calls add column if not exists answer jsonb;
commit;
