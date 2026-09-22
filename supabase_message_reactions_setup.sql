-- one reaction per user per message (primary key enforces this); switching
-- emoji is an upsert, tapping the same emoji again removes it
create table public.message_reactions (
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;

create policy "Participants can view reactions"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_participant(m.conversation_id)
    )
  );

create policy "Participants can react to messages"
  on public.message_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_participant(m.conversation_id)
    )
  );

create policy "Users can change their own reaction"
  on public.message_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can remove their own reaction"
  on public.message_reactions for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.message_reactions;
