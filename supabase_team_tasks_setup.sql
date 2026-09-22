-- ============================================================
-- task_assignees: many-to-many task <-> member assignment
-- (created first since the tasks policies below reference it)
-- ============================================================

create table if not exists public.task_assignees (
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  primary key (task_id, user_id)
);

alter table public.task_assignees enable row level security;

-- ============================================================
-- Team tasks: RLS for tasks.team_id IS NOT NULL
-- (personal-task policies already scope to team_id IS NULL, untouched)
-- ============================================================

drop policy if exists "Team members can view team tasks" on public.tasks;
create policy "Team members can view team tasks"
  on public.tasks for select
  using (team_id is not null and public.is_team_member(team_id));

drop policy if exists "Team members can create team tasks" on public.tasks;
create policy "Team members can create team tasks"
  on public.tasks for insert
  with check (
    team_id is not null
    and owner_id = auth.uid()
    and public.is_team_member(team_id)
  );

drop policy if exists "Creator, assignee, or admin can update team tasks" on public.tasks;
create policy "Creator, assignee, or admin can update team tasks"
  on public.tasks for update
  using (
    team_id is not null
    and (
      owner_id = auth.uid()
      or public.is_team_admin(team_id)
      or exists (
        select 1 from public.task_assignees
        where task_id = tasks.id and user_id = auth.uid()
      )
    )
  );

drop policy if exists "Creator or admin can delete team tasks" on public.tasks;
create policy "Creator or admin can delete team tasks"
  on public.tasks for delete
  using (
    team_id is not null
    and (owner_id = auth.uid() or public.is_team_admin(team_id))
  );

-- ============================================================
-- task_assignees' own policies
-- ============================================================

drop policy if exists "Team members can view assignees of their team's tasks" on public.task_assignees;
create policy "Team members can view assignees of their team's tasks"
  on public.task_assignees for select
  using (
    exists (
      select 1 from public.tasks
      where id = task_id and public.is_team_member(tasks.team_id)
    )
  );

drop policy if exists "Creator or admin can assign members to a team task" on public.task_assignees;
create policy "Creator or admin can assign members to a team task"
  on public.task_assignees for insert
  with check (
    exists (
      select 1 from public.tasks
      where id = task_id
        and (owner_id = auth.uid() or public.is_team_admin(tasks.team_id))
    )
  );

drop policy if exists "Creator or admin can unassign members from a team task" on public.task_assignees;
create policy "Creator or admin can unassign members from a team task"
  on public.task_assignees for delete
  using (
    exists (
      select 1 from public.tasks
      where id = task_id
        and (owner_id = auth.uid() or public.is_team_admin(tasks.team_id))
    )
  );

-- ============================================================
-- Member management: promote/demote + remove + leave
-- ============================================================

drop policy if exists "Admins can update member roles" on public.team_members;
create policy "Admins can update member roles"
  on public.team_members for update
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

drop policy if exists "Admins can remove members" on public.team_members;
create policy "Admins can remove members"
  on public.team_members for delete
  using (public.is_team_admin(team_id));

drop policy if exists "Members can remove themselves (leave team)" on public.team_members;
create policy "Members can remove themselves (leave team)"
  on public.team_members for delete
  using (user_id = auth.uid());
