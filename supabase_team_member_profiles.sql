-- lets a user see the basic profile (name, avatar) of anyone they share a
-- team with, without opening up profiles to everyone
create or replace function public.shares_team_with(other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members my_teams
    join public.team_members their_teams
      on my_teams.team_id = their_teams.team_id
    where my_teams.user_id = auth.uid()
      and their_teams.user_id = other_user_id
  );
$$;

grant execute on function public.shares_team_with(uuid) to authenticated;

create policy "Team members can view each other's basic profile"
  on public.profiles for select
  using (public.shares_team_with(id));
