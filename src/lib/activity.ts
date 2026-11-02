import { format, parseISO } from 'date-fns'
import type { Activity } from '../hooks/useTaskFeed'
import { PRIORITY_LABELS, STATUS_LABELS, type TaskPriority, type TaskStatus } from './types'

type Payload = Record<string, string | null | undefined>

/** One part of an activity sentence; `strong` parts are emphasized. */
export type Fragment = { text: string; strong?: boolean; status?: TaskStatus }

const day = (d: string) => format(parseISO(d), 'MMM d, yyyy')

/** Describes a task_activity row as sentence fragments, e.g. "moved from To Do → In Progress". */
export function describeActivity(activity: Activity): Fragment[] {
  const p = (activity.payload ?? {}) as Payload

  switch (activity.type) {
    case 'created':
      return [{ text: 'created this task' }]
    case 'status_changed': {
      const from = p.from as TaskStatus
      const to = p.to as TaskStatus
      return [
        { text: 'moved from ' },
        { text: STATUS_LABELS[from] ?? from, strong: true, status: from },
        { text: ' → ' },
        { text: STATUS_LABELS[to] ?? to, strong: true, status: to },
      ]
    }
    case 'title_changed':
      return [{ text: 'renamed this to ' }, { text: `“${p.to}”`, strong: true }]
    case 'priority_changed':
      return [
        { text: 'changed priority from ' },
        { text: PRIORITY_LABELS[p.from as TaskPriority] ?? String(p.from), strong: true },
        { text: ' to ' },
        { text: PRIORITY_LABELS[p.to as TaskPriority] ?? String(p.to), strong: true },
      ]
    case 'due_date_changed':
      if (!p.to) return [{ text: 'removed the due date' }]
      return [{ text: p.from ? 'changed the due date to ' : 'set the due date to ' }, { text: day(p.to), strong: true }]
    case 'description_changed':
      return [{ text: 'updated the description' }]
    case 'assignee_added':
      return [{ text: 'assigned ' }, { text: p.name ?? 'someone', strong: true }]
    case 'assignee_removed':
      return [{ text: 'unassigned ' }, { text: p.name ?? 'someone', strong: true }]
    case 'label_added':
      return [{ text: 'added label ' }, { text: p.name ?? 'a label', strong: true }]
    case 'label_removed':
      return [{ text: 'removed label ' }, { text: p.name ?? 'a label', strong: true }]
    default:
      return [{ text: activity.type.replaceAll('_', ' ') }]
  }
}
