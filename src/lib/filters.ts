import { dueUrgency } from './due'
import type { Task, TaskPriority } from './types'

export type Filters = {
  query: string
  priorities: TaskPriority[]
  assignees: string[]
  labels: string[]
  overdueOnly: boolean
}

/** Pseudo-assignee id for "tasks nobody is assigned to". */
export const UNASSIGNED = '__unassigned__'

export const EMPTY_FILTERS: Filters = { query: '', priorities: [], assignees: [], labels: [], overdueOnly: false }

export function hasActiveFilters(f: Filters): boolean {
  return !!f.query.trim() || f.priorities.length > 0 || f.assignees.length > 0 || f.labels.length > 0 || f.overdueOnly
}

export function isOverdue(task: Task, today = new Date()): boolean {
  return task.status !== 'done' && !!task.due_date && dueUrgency(task.due_date, today) === 'overdue'
}

/** Within a facet, values are OR'd; across facets, AND'd. */
export function matchesFilters(task: Task, f: Filters): boolean {
  const q = f.query.trim().toLowerCase()
  if (q && !task.title.toLowerCase().includes(q)) return false
  if (f.priorities.length && !f.priorities.includes(task.priority)) return false
  if (
    f.assignees.length &&
    !f.assignees.some((a) => (a === UNASSIGNED ? task.assignee_ids.length === 0 : task.assignee_ids.includes(a)))
  )
    return false
  if (f.labels.length && !f.labels.some((l) => task.label_ids.includes(l))) return false
  if (f.overdueOnly && !isOverdue(task)) return false
  return true
}
