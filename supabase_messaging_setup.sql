-- ============================================================
-- Tables
-- ============================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'team')),
  team_id uuid references public.teams(id) on delete cascade,
  created_at timestamptz default now()
);

create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  last_read_at timestamptz,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- ============================================================
-- RLS helper (same SECURITY DEFINER pattern used for team_members,
-- avoids self-referencing-policy recursion on conversation_participants)
-- ============================================================

create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ============================================================
-- RLS policies
-- (no general INSERT policy on conversations: creation only happens
-- through the SECURITY DEFINER function/triggers below)
-- ============================================================

create policy "Participants can view their conversations"
  on public.conversations for select
  using (public.is_conversation_participant(id));

create policy "Participants can view conversation participants"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

create policy "Users can update their own last_read_at"
  on public.conversation_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Participants can view messages"
  on public.messages for select
  using (public.is_conversation_participant(conversation_id));

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- ============================================================
-- Direct (1-on-1) conversations: find-or-create, atomic, bypasses
-- the chicken-and-egg RLS problem of inserting a conversation you're
-- not yet a participant of
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
begin
  if other_user_id = auth.uid() then
    raise exception 'Cannot start a conversation with yourself';
  end if;

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
-- Team group chat: auto-created per team, membership mirrors
-- team_members automatically via triggers
-- ============================================================

create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversations (type, team_id) values ('team', new.id);
  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute procedure public.handle_new_team();

create or replace function public.handle_team_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  select id into conv_id from public.conversations
  where team_id = new.team_id and type = 'team';

  if conv_id is not null then
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv_id, new.user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_team_member_added on public.team_members;
create trigger on_team_member_added
  after insert on public.team_members
  for each row execute procedure public.handle_team_member_added();

create or replace function public.handle_team_member_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  select id into conv_id from public.conversations
  where team_id = old.team_id and type = 'team';

  if conv_id is not null then
    delete from public.conversation_participants
    where conversation_id = conv_id and user_id = old.user_id;
  end if;

  return old;
end;
$$;

drop trigger if exists on_team_member_removed on public.team_members;
create trigger on_team_member_removed
  after delete on public.team_members
  for each row execute procedure public.handle_team_member_removed();

-- ============================================================
-- Backfill: teams already exist from before this migration
-- ============================================================

insert into public.conversations (type, team_id)
select 'team', t.id
from public.teams t
where not exists (
  select 1 from public.conversations c
  where c.team_id = t.id and c.type = 'team'
);

insert into public.conversation_participants (conversation_id, user_id)
select c.id, tm.user_id
from public.team_members tm
join public.conversations c on c.team_id = tm.team_id and c.type = 'team'
on conflict (conversation_id, user_id) do nothing;

-- ============================================================
-- Realtime: broadcast new messages to subscribed clients
-- ============================================================

alter publication supabase_realtime add table public.messages;
