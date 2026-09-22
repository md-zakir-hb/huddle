import { Task } from '../components/types';
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
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
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
