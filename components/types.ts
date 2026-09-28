export type Priority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  date?: string | null;
  priority?: Priority | null;
  reminder?: boolean | null;
  team_id?: string | null;
  assigned_to?: string | null;
  created_at: string;
  original_due_date?: string | null;
  reschedule_count?: number | null;
  completed_at?: string | null;
}
