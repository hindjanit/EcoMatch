begin;
alter table public.calls add column if not exists offer jsonb;
commit;
