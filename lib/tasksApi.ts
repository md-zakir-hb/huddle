import { Task } from '../components/types';
import {
  accrueOverduePenalties,
  logAbandonedDelete,
  logRescheduleFee,
  logTaskCompletion,
} from './ratingApi';
import { supabase } from './supabase';

export type NewTaskInput = {
  title: string;
  description?: string;
  date?: string;
  priority?: Task['priority'];
  reminder?: boolean;
  assigneeIds?: string[];
};

export async function fetchTasks(): Promise<Task[]> {
  try {
    await accrueOverduePenalties();
  } catch {
    // Non-fatal: scoring will catch up next time tasks are fetched.
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .is('team_id', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Task[];
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description,
      date: input.date,
      original_due_date: input.date,
      priority: input.priority,
      reminder: input.reminder,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export type TaskUpdate = Partial<{
  completed: boolean;
  title: string;
  description: string | null;
  date: string | null;
  priority: Task['priority'] | null;
  reminder: boolean;
}>;

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const { data: currentData, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  const current = currentData as Task;
  const isPersonal = !current.team_id;
  const finalPatch: TaskUpdate & {
    completed_at?: string;
    original_due_date?: string;
    reschedule_count?: number;
  } = { ...patch };

  // First-ever completion: record completed_at and log the rating event.
  // Re-completing after un-checking doesn't log again (completed_at is
  // only ever set once), so toggling can't be used to farm points.
  if (isPersonal && patch.completed === true && !current.completed && !current.completed_at) {
    const completedAt = new Date().toISOString();
    finalPatch.completed_at = completedAt;
    await logTaskCompletion(current, completedAt);
  }

  // Reschedule: only meaningful when the due date is actually changing on
  // an incomplete task outside of a completion toggle.
  if (
    isPersonal &&
    patch.date !== undefined &&
    patch.date !== current.date &&
    patch.date &&
    !current.completed &&
    patch.completed === undefined
  ) {
    const originalDue = current.original_due_date ?? current.date;
    const notYetOverdue = !originalDue || new Date() < new Date(originalDue);

    if (notYetOverdue) {
      await logRescheduleFee(current);
      finalPatch.original_due_date = patch.date;
      finalPatch.reschedule_count = (current.reschedule_count ?? 0) + 1;
    }
    // Already overdue: leave original_due_date locked, `date` still updates below.
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(finalPatch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { data: current } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (current) {
    await logAbandonedDelete(current as Task);
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTeamTasks(teamId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Task[];
}

export async function createTeamTask(
  teamId: string,
  input: NewTaskInput,
  assigneeIds: string[] = [],
): Promise<Task> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      owner_id: user.id,
      team_id: teamId,
      title: input.title,
      description: input.description,
      date: input.date,
      priority: input.priority,
      reminder: input.reminder,
    })
    .select()
    .single();

  if (error) throw error;

  if (assigneeIds.length > 0) {
    const { error: assignError } = await supabase
      .from('task_assignees')
      .insert(
        assigneeIds.map(userId => ({ task_id: data.id, user_id: userId })),
      );
    if (assignError) throw assignError;
  }

  return data as Task;
}

export interface TaskAssigneeProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export async function fetchAssigneesByTaskIds(
  taskIds: string[],
): Promise<Record<string, TaskAssigneeProfile[]>> {
  if (taskIds.length === 0) return {};

  const { data: assigneeRows, error: assigneeError } = await supabase
    .from('task_assignees')
    .select('task_id, user_id')
    .in('task_id', taskIds);

  if (assigneeError) throw assigneeError;
  if (!assigneeRows || assigneeRows.length === 0) return {};

  const userIds = [...new Set(assigneeRows.map(row => row.user_id))];

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds);

  if (profileError) throw profileError;

  const profileById = new Map(
    (profileRows as TaskAssigneeProfile[]).map(profile => [
      profile.id,
      profile,
    ]),
  );

  const result: Record<string, TaskAssigneeProfile[]> = {};
  for (const row of assigneeRows) {
    const profile = profileById.get(row.user_id);
    if (!profile) continue;
    (result[row.task_id] ??= []).push(profile);
  }
  return result;
}

export async function setTaskAssignees(
  taskId: string,
  userIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId);
  if (deleteError) throw deleteError;

  if (userIds.length > 0) {
    const { error: insertError } = await supabase
      .from('task_assignees')
      .insert(userIds.map(userId => ({ task_id: taskId, user_id: userId })));
    if (insertError) throw insertError;
  }
}
