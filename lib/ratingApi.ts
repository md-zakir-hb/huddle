import { Task } from '../components/types';
import { supabase } from './supabase';

const BASE_POINTS: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

function basePoints(priority?: Task['priority'] | null): number {
  return BASE_POINTS[priority ?? 'Low'] ?? 1;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Backfills any missing daily overdue penalties for the signed-in user's tasks. */
export async function accrueOverduePenalties(): Promise<void> {
  const { error } = await supabase.rpc('accrue_overdue_penalties');
  if (error) throw error;
}

/** Rolling window score so a bad stretch is always recoverable. */
export async function getRatingScore(days = 30): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('rating_events')
    .select('points')
    .eq('user_id', user.id)
    .gte('event_date', since.toISOString().slice(0, 10));

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.points), 0);
}

export async function getCurrentStreak(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from('user_rating_stats')
    .select('current_streak')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.current_streak ?? 0;
}

async function setStreak(userId: string, streak: number): Promise<void> {
  const { error } = await supabase
    .from('user_rating_stats')
    .upsert({ user_id: userId, current_streak: streak, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Call right after a personal task's first-ever completion. */
export async function logTaskCompletion(task: Task, completedAtIso: string): Promise<void> {
  if (task.team_id) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const dueDate = task.original_due_date ?? task.date;
  const onTime = !dueDate || new Date(completedAtIso) <= new Date(dueDate);

  if (onTime) {
    const streak = await getCurrentStreak();
    const bonus = Math.min(streak * 0.05, 0.5);
    const points = basePoints(task.priority) * (1 + bonus);

    const { error } = await supabase.from('rating_events').insert({
      user_id: user.id,
      task_id: task.id,
      task_title: task.title,
      points,
      reason: 'on_time_completion',
      event_date: todayIso(),
    });
    if (error) throw error;

    await setStreak(user.id, streak + 1);
  } else {
    await setStreak(user.id, 0);
  }
}

/** Call before deleting a task that is still overdue and incomplete. */
export async function logAbandonedDelete(task: Task): Promise<void> {
  if (task.team_id || task.completed) return;

  const dueDate = task.original_due_date ?? task.date;
  if (!dueDate || new Date(dueDate) >= new Date()) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('rating_events').insert({
    user_id: user.id,
    task_id: task.id,
    task_title: task.title,
    points: -3.5 * basePoints(task.priority),
    reason: 'abandoned_delete',
    event_date: todayIso(),
  });
  if (error) throw error;
}

/**
 * Call when a not-yet-overdue personal task's due date is being pushed
 * later. Logs the reschedule fee and returns it (0 if the task is already
 * overdue - callers should not move original_due_date in that case).
 */
export async function logRescheduleFee(task: Task): Promise<number> {
  if (task.team_id || task.completed) return 0;

  const originalDue = task.original_due_date ?? task.date;
  if (originalDue && new Date(originalDue) < new Date()) return 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const count = task.reschedule_count ?? 0;
  const fee = (count >= 2 ? -0.5 : -0.25) * basePoints(task.priority);

  const { error } = await supabase.from('rating_events').insert({
    user_id: user.id,
    task_id: task.id,
    task_title: task.title,
    points: fee,
    reason: 'reschedule_fee',
    event_date: todayIso(),
  });
  if (error) throw error;

  return fee;
}
