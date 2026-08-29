-- EcoMatch Phase 15 — participant-aware inbox, unread state and notifications
-- Run after phase12_chat_messages_fix.sql.

alter table public.messages
  add column if not exists read_at timestamptz;

create index if not exists idx_messages_unread
  on public.messages(conversation_id, sender_id, read_at)
  where read_at is null;

drop policy if exists "messages_update_read_state" on public.messages;
create policy "messages_update_read_state"
on public.messages for update to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

-- Returns only conversations in which the authenticated user participates.
-- SECURITY DEFINER intentionally avoids broad profile SELECT policies while exposing
-- only the counterparty's public marketplace identity fields.
create or replace function public.get_my_conversation_inbox()
returns table (
  id bigint,
  product_id bigint,
  buyer_id uuid,
  seller_id uuid,
  created_at timestamptz,
  product_title text,
  product_category text,
  product_price numeric,
  counterparty_id uuid,
  counterparty_name text,
  counterparty_verification_status text,
  counterparty_avatar_url text,
  counterparty_role text,
  last_message_id bigint,
  last_message text,
  last_message_sender_id uuid,
  last_message_created_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.product_id,
    c.buyer_id,
    c.seller_id,
    c.created_at,
    p.title as product_title,
    p.category as product_category,
    p.price as product_price,
    cp.id as counterparty_id,
    coalesce(
      nullif(trim(cp.full_name), ''),
      case when c.buyer_id = auth.uid() then 'EcoMatch seller' else 'EcoMatch buyer' end
    ) as counterparty_name,
    cp.verification_status as counterparty_verification_status,
    cp.avatar_url as counterparty_avatar_url,
    case when c.buyer_id = auth.uid() then 'Seller' else 'Buyer' end as counterparty_role,
    lm.id as last_message_id,
    lm.message as last_message,
    lm.sender_id as last_message_sender_id,
    lm.created_at as last_message_created_at,
    (
      select count(*)
      from public.messages unread
      where unread.conversation_id = c.id
        and unread.sender_id <> auth.uid()
        and unread.read_at is null
    ) as unread_count
  from public.conversations c
  left join public.products p on p.id = c.product_id
  left join public.profiles cp on cp.id = case
    when c.buyer_id = auth.uid() then c.seller_id
    else c.buyer_id
  end
  left join lateral (
    select m.id, m.message, m.sender_id, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  where auth.uid() is not null
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

revoke all on function public.get_my_conversation_inbox() from public;
grant execute on function public.get_my_conversation_inbox() to authenticated;

create or replace function public.get_unread_message_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() is not null
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;

revoke all on function public.get_unread_message_count() from public;
grant execute on function public.get_unread_message_count() to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ) then
    raise exception 'Conversation not found or access denied';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_conversation_read(bigint) from public;
grant execute on function public.mark_conversation_read(bigint) to authenticated;

-- Ensure INSERT events can power live inbox badges and notification toasts.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

notify pgrst, 'reload schema';
