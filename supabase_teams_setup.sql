-- teams table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

alter table public.teams enable row level security;

-- team_members table (who belongs to which team)
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

alter table public.team_members enable row level security;

-- a user can see a team if they created it OR are already a member of it
-- (the "created it" clause matters at creation time, before their own
-- membership row exists yet)
create policy "Members and creators can view their teams"
  on public.teams for select
  using (
    created_by = auth.uid()
    or id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- any signed-in user can create a team (they become its creator)
create policy "Users can create teams"
  on public.teams for insert
  with check (created_by = auth.uid());

-- a user can see the membership list of teams they belong to
create policy "Members can view their team's membership list"
  on public.team_members for select
  using (
    team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- the creator of a team can add themself as its first member
create policy "Creators can add themselves as a member"
  on public.team_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.teams
      where id = team_id and created_by = auth.uid()
    )
  );
