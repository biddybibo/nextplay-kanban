import { clsx } from 'clsx'
import { differenceInCalendarDays, format, isThisYear, parseISO } from 'date-fns'
import { dueUrgency, type DueUrgency } from '../lib/due'
import { AlertCircle, CalendarDays, Clock } from 'lucide-react'

function relativeLabel(dueDate: string): string {
  const date = parseISO(dueDate)
  const days = differenceInCalendarDays(date, new Date())
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return format(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy')
}

const STYLES: Record<DueUrgency, string> = {
  overdue: 'bg-red-50 text-red-700 ring-red-200/70',
  soon: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  later: 'bg-zinc-50 text-zinc-600 ring-zinc-200',
}

const ICONS = { overdue: AlertCircle, soon: Clock, later: CalendarDays }

/** Completed tasks always render neutral: a done task isn't "overdue". */
export function DueDateChip({ dueDate, done }: { dueDate: string; done?: boolean }) {
  const urgency = done ? 'later' : dueUrgency(dueDate)
  const Icon = ICONS[urgency]

  return (
    <span
      className={clsx(
        'inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium ring-1 ring-inset',
        STYLES[urgency],
      )}
      title={format(parseISO(dueDate), 'EEEE, MMMM d, yyyy')}
    >
      <Icon className="size-3" strokeWidth={2.25} />
      {relativeLabel(dueDate)}
    </span>
  )
}
