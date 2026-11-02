import type { Tables } from './database.types'

export const STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const
export type TaskStatus = (typeof STATUSES)[number]

export const PRIORITIES = ['low', 'normal', 'high'] as const
export type TaskPriority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

// The DB enforces these values with CHECK constraints; narrow the generated
// `string` columns so the rest of the app gets exhaustive unions.
export type Task = Omit<Tables<'tasks'>, 'status' | 'priority'> & {
  status: TaskStatus
  priority: TaskPriority
  /** From the task_assignees / task_labels join tables. */
  assignee_ids: string[]
  label_ids: string[]
}

export type Member = Tables<'team_members'>
export type Label = Tables<'labels'>

export type NewTask = {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  assignee_ids?: string[]
  label_ids?: string[]
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'position'>
>
