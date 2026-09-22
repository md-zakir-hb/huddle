-- Computes the conversation list (DM + team) with a preview of the last
-- message and an unread count, in one round trip. Security-definer, but
-- scoped by the join to conversation_participants for the caller, so it
-- only ever returns the caller's own conversations.
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
    (
      select count(*) from public.messages m2
      where m2.conversation_id = c.id
        and m2.created_at > coalesce(my.last_read_at, 'epoch'::timestamptz)
        and m2.sender_id <> auth.uid()
    ) as unread_count
  from public.conversations c
  join public.conversation_participants my
    on my.conversation_id = c.id and my.user_id = auth.uid()
  left join public.teams t on t.id = c.team_id
  left join lateral (
    select cp.user_id as id
    from public.conversation_participants cp
    where cp.conversation_id = c.id and cp.user_id <> auth.uid()
    limit 1
  ) ou on c.type = 'direct'
  left join public.profiles op on op.id = ou.id
  left join lateral (
    select m.content, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

grant execute on function public.fetch_conversations() to authenticated;
