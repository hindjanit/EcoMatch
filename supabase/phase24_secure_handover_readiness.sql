-- Phase 24: authoritative self-pickup handover readiness and atomic transfer.
-- Additive and safe to run after phases 18, 19 and 23.
begin;

create or replace function public.trust_self_pickup_readiness(p_deal uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deal_requests%rowtype;
  p public.products%rowtype;
  buyer_status text;
  seller_status text;
  disclosure_version_value integer;
  completed boolean := false;
begin
  select * into d from public.deal_requests where id = p_deal;
  if d.id is null or auth.uid() is null or auth.uid() not in (d.buyer_id, d.seller_id) then
    raise exception 'Deal access denied';
  end if;
  select * into p from public.products where id = d.product_id;
  select verification_status into buyer_status from public.profiles where id = d.buyer_id;
  select verification_status into seller_status from public.profiles where id = d.seller_id;
  select disclosure_version into disclosure_version_value
  from public.product_condition_disclosures where product_id = d.product_id;
  completed := d.status = 'completed' and exists (select 1 from public.ownership_events oe where oe.deal_id = d.id);

  return jsonb_build_object(
    'completed', completed,
    'ready', not completed
      and d.fulfilment_mode = 'self_pickup'
      and d.status = 'exchange_ready'
      and not coalesce(d.is_disputed, false)
      and buyer_status in ('verified', 'verified_demo')
      and seller_status in ('verified', 'verified_demo')
      and d.exchange_code_verified_at is not null
      and coalesce(d.proximity_verified, false)
      and d.buyer_handover_confirmed_at is not null
      and d.seller_handover_confirmed_at is not null
      and (disclosure_version_value is null or (d.buyer_disclosure_confirmation = 'matches' and d.disclosure_version_confirmed = disclosure_version_value))
      and p.id is not null and p.status = 'approved' and p.seller_id = d.seller_id
      and (p.current_owner_id is null or p.current_owner_id = d.seller_id),
    'requirements', jsonb_build_object(
      'selfPickup', d.fulfilment_mode = 'self_pickup',
      'meetingReady', d.status = 'exchange_ready',
      'identity', buyer_status in ('verified', 'verified_demo') and seller_status in ('verified', 'verified_demo'),
      'verification', d.exchange_code_verified_at is not null,
      'verificationMethod', case when d.qr_verified_at is not null then 'qr' when d.exchange_code_verified_at is not null then 'otp' else null end,
      'proximity', coalesce(d.proximity_verified, false),
      'buyerConfirmation', d.buyer_handover_confirmed_at is not null,
      'sellerConfirmation', d.seller_handover_confirmed_at is not null,
      'disclosure', disclosure_version_value is null or (d.buyer_disclosure_confirmation = 'matches' and d.disclosure_version_confirmed = disclosure_version_value),
      'noDispute', not coalesce(d.is_disputed, false),
      'sellerOwnsProduct', p.id is not null and p.status = 'approved' and p.seller_id = d.seller_id and (p.current_owner_id is null or p.current_owner_id = d.seller_id)
    )
  );
end $$;

create or replace function public.trust_self_pickup(p_deal uuid, p_action text, p_code text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  d public.deal_requests%rowtype;
  p public.products%rowtype;
  u uuid := auth.uid();
  code text;
  previous text;
  h text;
  disclosure_version_value integer;
  buyer_status text;
  seller_status text;
begin
  select * into d from public.deal_requests where id = p_deal for update;
  if d.id is null or u is null or u not in (d.buyer_id, d.seller_id) then raise exception 'Self-pickup access denied'; end if;
  if d.fulfilment_mode <> 'self_pickup' then raise exception 'This is not a self-pickup handover'; end if;
  if coalesce(d.is_disputed, false) then raise exception 'Active condition dispute prevents handover'; end if;
  if d.status = 'completed' and p_action = 'confirm' then
    if exists (select 1 from public.ownership_events where deal_id = d.id) then return 'completed'; end if;
    raise exception 'Completed deal is missing its ownership ledger event; admin review is required';
  end if;
  if d.status not in ('accepted', 'meeting_planned', 'exchange_ready') then raise exception 'Deal is not ready for handover'; end if;

  perform set_config('ecomatch.handover_rpc', 'authorized', true);
  if p_action = 'generate' then
    if u <> d.seller_id or d.exchange_code_verified_at is not null then raise exception 'Seller must generate before verification'; end if;
    code := lpad((100000 + (get_byte(gen_random_bytes(1),0) * 65536 + get_byte(gen_random_bytes(1),0) * 256 + get_byte(gen_random_bytes(1),0)) % 900000)::text, 6, '0');
    update public.deal_requests set exchange_code_hash = crypt(code, gen_salt('bf')), exchange_code_generated_at = now(), exchange_code_expires_at = now() + interval '10 minutes', exchange_code_attempts = 0, buyer_handover_confirmed_at = null, seller_handover_confirmed_at = null where id = d.id;
    return code;
  elsif p_action = 'verify' then
    if u <> d.buyer_id then raise exception 'Only buyer may verify'; end if;
    if d.exchange_code_verified_at is not null or d.exchange_code_expires_at is null or d.exchange_code_expires_at <= now() or coalesce(d.exchange_code_attempts,0) >= 5 or d.exchange_code_hash is null or p_code is null or p_code !~ '^\d{6}$' then return 'false'; end if;
    update public.deal_requests set exchange_code_attempts = coalesce(exchange_code_attempts,0) + 1 where id = d.id;
    if left(d.exchange_code_hash, 3) = '$2a' and crypt(p_code, d.exchange_code_hash) = d.exchange_code_hash then
      update public.deal_requests set exchange_code_verified_at = now(), status = 'exchange_ready' where id = d.id;
      return 'true';
    end if;
    return 'false';
  elsif p_action <> 'confirm' then
    raise exception 'Unknown handover action';
  end if;

  if d.exchange_code_verified_at is null then raise exception 'Verify the QR or handover OTP first'; end if;
  if not coalesce(d.proximity_verified, false) then raise exception 'Physical proximity is still required'; end if;
  select verification_status into buyer_status from public.profiles where id = d.buyer_id;
  select verification_status into seller_status from public.profiles where id = d.seller_id;
  if buyer_status not in ('verified', 'verified_demo') or seller_status not in ('verified', 'verified_demo') then raise exception 'Both participants require completed identity verification'; end if;
  select disclosure_version into disclosure_version_value from public.product_condition_disclosures where product_id = d.product_id;
  if disclosure_version_value is not null and (d.buyer_disclosure_confirmation <> 'matches' or d.disclosure_version_confirmed <> disclosure_version_value) then raise exception 'Buyer has not confirmed the current seller condition disclosure'; end if;

  update public.deal_requests
  set buyer_handover_confirmed_at = case when u = buyer_id then coalesce(buyer_handover_confirmed_at, now()) else buyer_handover_confirmed_at end,
      seller_handover_confirmed_at = case when u = seller_id then coalesce(seller_handover_confirmed_at, now()) else seller_handover_confirmed_at end
  where id = d.id
  returning * into d;
  if d.buyer_handover_confirmed_at is null or d.seller_handover_confirmed_at is null then
    insert into public.deal_audit_logs(deal_id, actor_id, event_type, metadata) values(d.id, u, 'self_pickup_confirmed', jsonb_build_object('completed', false));
    return 'waiting_for_other_party';
  end if;

  select * into p from public.products where id = d.product_id for update;
  if p.id is null or p.status <> 'approved' or p.seller_id <> d.seller_id or (p.current_owner_id is not null and p.current_owner_id <> d.seller_id) then raise exception 'Seller is not the current owner of an available product'; end if;
  perform pg_advisory_xact_lock(180018);
  if exists (select 1 from public.ownership_events where deal_id = d.id) then
    update public.deal_requests set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now() where id = d.id;
    return 'completed';
  end if;
  select event_hash into previous from public.ownership_events order by created_at desc, id desc limit 1;
  previous := coalesce(previous, 'GENESIS');
  h := encode(digest(concat_ws('|', d.id, d.product_id, d.buyer_id, d.seller_id, previous, now()), 'sha256'), 'hex');
  update public.products set status = 'sold', current_owner_id = d.buyer_id, sold_deal_id = d.id where id = d.product_id;
  update public.deal_requests set status = 'completed', completed_at = now(), updated_at = now() where id = d.id;
  insert into public.ownership_events(product_id, deal_id, deal_code, previous_owner_id, new_owner_id, previous_hash, event_hash)
  values(d.product_id, d.id, d.deal_code, d.seller_id, d.buyer_id, previous, h);
  insert into public.deal_audit_logs(deal_id, actor_id, event_type, metadata) values(d.id, u, 'self_pickup_confirmed', jsonb_build_object('completed', true, 'verificationMethod', case when d.qr_verified_at is not null then 'qr' else 'otp' end));
  return 'completed';
end $$;

revoke all on function public.trust_self_pickup_readiness(uuid) from public, anon;
grant execute on function public.trust_self_pickup_readiness(uuid) to authenticated;
revoke all on function public.trust_self_pickup(uuid, text, text) from public, anon;
grant execute on function public.trust_self_pickup(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
commit;
