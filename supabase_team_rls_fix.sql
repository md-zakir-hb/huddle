-- SECURITY DEFINER helpers: these bypass RLS internally, which is exactly
-- what lets them check team_members membership from *within* team_members'
-- own policies without triggering infinite recursion.
create or replace function public.is_team_member(check_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(check_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = check_team_id and user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_admin(uuid) to authenticated;

-- replace the recursive policies with ones that use the helper functions
drop policy if exists "Members and creators can view their teams" on public.teams;
create policy "Members and creators can view their teams"
  on public.teams for select
  using (created_by = auth.uid() or public.is_team_member(id));

drop policy if exists "Members can view their team's membership list" on public.team_members;
create policy "Members can view their team's membership list"
  on public.team_members for select
  using (public.is_team_member(team_id));

drop policy if exists "Admins can add other members" on public.team_members;
create policy "Admins can add other members"
  on public.team_members for insert
  with check (public.is_team_admin(team_id));
