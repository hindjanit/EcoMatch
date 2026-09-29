-- EcoMatch Phase 22: allow an active caller to join the recipient's private
-- signaling topic. This is required for private Broadcast offer delivery.
begin;

drop policy if exists trust_signal_receive on realtime.messages;
create policy trust_signal_receive on realtime.messages for select to authenticated using(
  extension='broadcast' and (
    realtime.topic()='user-signaling-'||auth.uid()::text
    or exists(select 1 from public.calls where status in('RINGING','ACCEPTED') and (
      (caller_id=auth.uid() and realtime.topic()='user-signaling-'||receiver_id::text)
      or (receiver_id=auth.uid() and realtime.topic()='user-signaling-'||caller_id::text)
    ))
  )
);

commit;
