import { differenceInCalendarDays, parseISO } from 'date-fns'

export type DueUrgency = 'overdue' | 'soon' | 'later'

export function dueUrgency(dueDate: string, today = new Date()): DueUrgency {
  const days = differenceInCalendarDays(parseISO(dueDate), today)
  if (days < 0) return 'overdue'
  if (days <= 2) return 'soon'
  return 'later'
}
