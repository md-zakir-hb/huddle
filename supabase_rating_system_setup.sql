-- ============================================================
-- Personal task rating/points system
-- ============================================================

-- tasks: extra columns needed for scoring
alter table public.tasks
  add column if not exists original_due_date timestamptz,
  add column if not exists reschedule_count int not null default 0,
  add column if not exists completed_at timestamptz;

-- backfill original_due_date for existing rows so old tasks aren't excluded
update public.tasks
  set original_due_date = date
  where original_due_date is null and date is not null;

-- ============================================================
-- rating_events: append-only ledger. Never updated or deleted by
-- clients (no update/delete RLS policy), so history survives even
-- if the source task is later edited or deleted.
-- ============================================================

create table if not exists public.rating_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,
  points numeric not null,
  reason text not null check (
    reason in ('on_time_completion', 'overdue_daily', 'abandoned_delete', 'reschedule_fee')
  ),
  event_date date not null default current_date,
  created_at timestamptz default now(),
  unique (task_id, event_date, reason)
);

alter table public.rating_events enable row level security;

drop policy if exists "Users can view own rating events" on public.rating_events;
create policy "Users can view own rating events"
  on public.rating_events for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own rating events" on public.rating_events;
create policy "Users can insert own rating events"
  on public.rating_events for insert
  with check (user_id = auth.uid());

-- ============================================================
-- user_rating_stats: tracks the on-time completion streak used
-- for the streak bonus.
-- ============================================================

create table if not exists public.user_rating_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  updated_at timestamptz default now()
);

alter table public.user_rating_stats enable row level security;

drop policy if exists "Users can view own streak" on public.user_rating_stats;
create policy "Users can view own streak"
  on public.user_rating_stats for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own streak" on public.user_rating_stats;
create policy "Users can insert own streak"
  on public.user_rating_stats for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own streak" on public.user_rating_stats;
create policy "Users can update own streak"
  on public.user_rating_stats for update
  using (user_id = auth.uid());

-- ============================================================
-- accrue_overdue_penalties: called by the client (see
-- lib/ratingApi.ts) whenever tasks are loaded. For every overdue,
-- incomplete personal task it backfills any missing daily penalty
-- rows (capped at -3x base per task), so scoring stays correct
-- even if the app wasn't opened every day.
-- ============================================================

create or replace function public.accrue_overdue_penalties()
returns void
language plpgsql
security invoker
as $$
declare
  t record;
  base numeric;
  cap numeric;
  cumulative numeric;
  day_num int;
  amt numeric;
  event_day date;
  actual_days_overdue int;
begin
  for t in
    select id, owner_id, title, priority, original_due_date
    from public.tasks
    where owner_id = auth.uid()
      and team_id is null
      and completed = false
      and original_due_date is not null
      and original_due_date < now()
  loop
    base := case t.priority when 'High' then 3 when 'Medium' then 2 else 1 end;
    cap := -3 * base;
    actual_days_overdue := greatest(1, (current_date - t.original_due_date::date));

    select coalesce(sum(points), 0) into cumulative
      from public.rating_events
      where task_id = t.id and reason = 'overdue_daily';

    select count(*) into day_num
      from public.rating_events
      where task_id = t.id and reason = 'overdue_daily';

    while day_num < actual_days_overdue and cumulative > cap loop
      day_num := day_num + 1;
      event_day := (t.original_due_date::date) + day_num;

      if day_num = 1 then
        amt := -0.5 * base;
      elsif day_num = 2 then
        amt := -1 * base;
      else
        amt := -1.5 * base;
      end if;

      if cumulative + amt < cap then
        amt := cap - cumulative;
      end if;

      insert into public.rating_events (user_id, task_id, task_title, points, reason, event_date)
      values (t.owner_id, t.id, t.title, amt, 'overdue_daily', event_day)
      on conflict (task_id, event_date, reason) do nothing;

      cumulative := cumulative + amt;
    end loop;
  end loop;
end;
$$;
