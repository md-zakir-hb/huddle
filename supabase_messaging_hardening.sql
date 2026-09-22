-- ============================================================
-- 1. Cap message length (basic hardening against runaway payloads)
-- ============================================================

alter table public.messages
  add constraint messages_content_length check (char_length(content) <= 4000);

-- ============================================================
-- 2. create_direct_conversation: serialize concurrent calls for the
-- same pair of users so two people tapping "message" on each other
-- at the same instant can't create two separate direct conversations.
-- ============================================================

create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
  user_a uuid;
  user_b uuid;
begin
  if other_user_id = auth.uid() then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  if auth.uid() < other_user_id then
    user_a := auth.uid();
    user_b := other_user_id;
  else
    user_a := other_user_id;
    user_b := auth.uid();
  end if;

  -- Transaction-scoped advisory lock, released automatically when this
  -- call's implicit transaction ends. Makes the find-or-create below
  -- atomic across concurrent calls for the same pair.
  perform pg_advisory_xact_lock(hashtextextended(user_a::text || ':' || user_b::text, 0));

  select c.id into existing_id
  from public.conversations c
  where c.type = 'direct'
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = c.id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = c.id and p.user_id = other_user_id
    )
    and (
      select count(*) from public.conversation_participants p
      where p.conversation_id = c.id
    ) = 2
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (type) values ('direct') returning id into new_id;
  insert into public.conversation_participants (conversation_id, user_id)
    values (new_id, auth.uid()), (new_id, other_user_id);

  return new_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- ============================================================
-- 3. fetch_conversations: replace the per-row correlated subquery
-- (one messages scan per conversation) with two aggregated CTEs
-- (one scan total), so the list stays cheap as message volume grows.
-- ============================================================

create or replace function public.fetch_conversations()
returns table (
  conversation_id uuid,
  type text,
  team_id uuid,
  team_name text,
  other_user_id uuid,
  other_user_name text,
  other_user_avatar_url text,
  last_message text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  with my_conversations as (
    select conversation_id, last_read_at
    from public.conversation_participants
    where user_id = auth.uid()
  ),
  unread_counts as (
    select m.conversation_id, count(*) as unread_count
    from public.messages m
    join my_conversations mc on mc.conversation_id = m.conversation_id
    where m.sender_id <> auth.uid()
      and m.created_at > coalesce(mc.last_read_at, 'epoch'::timestamptz)
    group by m.conversation_id
  ),
  last_messages as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.content, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id in (select conversation_id from my_conversations)
    order by m.conversation_id, m.created_at desc
  )
  select
    c.id as conversation_id,
    c.type,
    c.team_id,
    t.name as team_name,
    ou.id as other_user_id,
    op.name as other_user_name,
    op.avatar_url as other_user_avatar_url,
    lm.content as last_message,
    lm.created_at as last_message_at,
    lm.sender_id as last_message_sender_id,
    coalesce(uc.unread_count, 0) as unread_count
  from my_conversations mc
  join public.conversations c on c.id = mc.conversation_id
  left join public.teams t on t.id = c.team_id
  left join lateral (
    select cp.user_id as id
    from public.conversation_participants cp
    where cp.conversation_id = c.id and cp.user_id <> auth.uid()
    limit 1
  ) ou on c.type = 'direct'
  left join public.profiles op on op.id = ou.id
  left join last_messages lm on lm.conversation_id = c.id
  left join unread_counts uc on uc.conversation_id = c.id
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

grant execute on function public.fetch_conversations() to authenticated;
