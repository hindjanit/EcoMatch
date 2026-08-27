-- ====================================================================
-- PHASE 13: COMPREHENSIVE ANTI-CIRCUMVENTION & CONTACT SAFETY FILTER
-- Blocks phone numbers (direct & disguised), isolated digits, emails,
-- Instagram / social handles, external links, and off-platform prompts.
-- ====================================================================

create or replace function public.send_safe_message(
  p_conversation_id bigint,
  p_message text,
  p_ai_flag boolean default false,
  p_ai_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.conversations%rowtype;
  clean_message text;
  lower_message text;
  digits_only text;
  violation_reason text := null;
  inserted_id bigint;
begin
  -- 1. Conversation exists check
  select * into c from public.conversations where id = p_conversation_id;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'Conversation not found');
  end if;

  -- 2. Participant authorization check
  if auth.uid() <> c.buyer_id and auth.uid() <> c.seller_id then
    return jsonb_build_object('allowed', false, 'reason', 'Not a participant in this conversation');
  end if;

  clean_message := trim(coalesce(p_message, ''));
  lower_message := lower(clean_message);
  if clean_message = '' then
    return jsonb_build_object('allowed', false, 'reason', 'Empty message');
  end if;

  -- Extract all digits from message to detect disguised numbers (e.g. 9958.45 itna du 5050)
  digits_only := regexp_replace(clean_message, '\D', '', 'g');

  -- Rule 1: Single/Double isolated digit message spam (e.g. "9", "7", "8")
  if clean_message ~ '^\s*[0-9]{1,2}\s*$' then
    violation_reason := 'Single isolated digits cannot be sent individually to prevent contact sharing';

  -- Rule 2: 10-digit Indian Mobile Number (Direct or with country code 0/+91)
  elsif clean_message ~ '(^|[^0-9])(0|\+?91)?[6-9][0-9]{9}([^0-9]|$)' then
    violation_reason := 'Phone number sharing detected';

  -- Rule 3: Disguised phone number (10+ digits distributed across the message)
  elsif length(digits_only) >= 10 and digits_only ~ '(0|91)?[6-9][0-9]{9}' then
    violation_reason := 'Disguised phone number sharing detected';

  -- Rule 4: Email address (Standard and Obfuscated like "name at domain dot com")
  elsif clean_message ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
     or lower_message ~* '[a-z0-9._%+\-]+\s*(@|\[at\]|\(at\)|\bat\b)\s*[a-z0-9.\-]+\s*(\.|\bdot\b|\[dot\])\s*(com|in|org|net|co|io|me|xyz|gmail|yahoo|outlook)'
     or (lower_message ~* '(gmail|yahoo|outlook|hotmail|icloud|protonmail)' and lower_message ~* '(mail|email|id|address|send|contact)') then
    violation_reason := 'Email address sharing detected';

  -- Rule 5: Social handles & platform mentions (Instagram, WhatsApp, Telegram, Snapchat, FB, Discord)
  elsif lower_message ~* '(whats[ ]?app|telegram|insta(gram)?|snap(chat)?|facebook|twitter|discord|threads)'
    and (lower_message ~* '(id|handle|account|no|number|bhejo|ping|dm|add|message|call|pe|par|join)'
         or clean_message ~* '@[a-zA-Z0-9._]{3,}'
         or lower_message ~* '(insta|ig|snap|tg|wa)[ ]*(id|handle|pe|par|no)?[ ]*[:=\-]?[ ]*@?[a-zA-Z0-9._]{3,}') then
    violation_reason := 'Social media or off-platform handle/contact sharing detected';

  -- Rule 6: Handle @tagging (excluding normal emails)
  elsif clean_message ~* '@[a-zA-Z0-9._]{3,}' and not (clean_message ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}') then
    violation_reason := 'Social handle or username tag detected';

  -- Rule 7: External links & domain URLs
  elsif clean_message ~* '(https?://|www\.)'
     or clean_message ~* '\b[a-zA-Z0-9\-]+\.(com|in|org|net|co|io|me|xyz|app|ai|site|online|tech|store|info|biz|tv|link|click|gl|ly|to)\b'
     or lower_message ~* '(bit\.ly|tinyurl\.com|t\.co|wa\.me|t\.me|chat\.whatsapp\.com|drive\.google\.com|forms\.gle)' then
    violation_reason := 'External link or web redirect detected';

  -- Rule 8: Off-platform request phrases
  elsif lower_message ~* '(phone[ ]*no|mobile[ ]*no|contact[ ]*no|whatsapp[ ]*no|call[ ]*me|text[ ]*me|dm[ ]*me|apna[ ]*no|apna[ ]*number|number[ ]*bhejo|no[ ]*do|number[ ]*do|contact[ ]*share|phone[ ]*do|call[ ]*karo|outside[ ]*ecomatch|direct[ ]*deal|direct[ ]*payment|bina[ ]*ecomatch)' then
    violation_reason := 'Requesting or attempting off-platform contact sharing is restricted';

  -- Rule 9: AI Flag
  elsif p_ai_flag then
    violation_reason := coalesce(nullif(trim(p_ai_reason), ''), 'AI detected an off-platform contact sharing attempt');
  end if;

  -- If any rule was violated, record event & block
  if violation_reason is not null then
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='chat_safety_events') then
      insert into public.chat_safety_events(conversation_id, sender_id, reason, risk_level)
      values(p_conversation_id, auth.uid(), violation_reason, 'high');
    end if;

    return jsonb_build_object(
      'allowed', false,
      'reason', violation_reason,
      'warning', 'For your safety, phone numbers, emails, Instagram IDs, and external links cannot be shared on EcoMatch.'
    );
  end if;

  -- Insert message securely
  insert into public.messages(conversation_id, sender_id, message)
  values(p_conversation_id, auth.uid(), clean_message)
  returning id into inserted_id;

  return jsonb_build_object('allowed', true, 'message_id', inserted_id);
end;
$$;

grant execute on function public.send_safe_message(bigint, text, boolean, text) to authenticated, anon;
notify pgrst, 'reload schema';
