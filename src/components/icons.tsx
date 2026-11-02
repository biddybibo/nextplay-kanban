import { clsx } from 'clsx'
import type { TaskPriority, TaskStatus } from '../lib/types'

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'var(--color-status-todo)',
  in_progress: 'var(--color-status-progress)',
  in_review: 'var(--color-status-review)',
  done: 'var(--color-status-done)',
}

/** Ring that fills up as work progresses: empty → half → three-quarters → check. */
export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const color = STATUS_COLOR[status]
  const r = 5
  const c = 2 * Math.PI * r
  const fill = { todo: 0, in_progress: 0.5, in_review: 0.75, done: 1 }[status]

  return (
    <svg viewBox="0 0 16 16" className={clsx('size-3.5 shrink-0', className)} aria-hidden>
      {status === 'done' ? (
        <>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle
            cx="8"
            cy="8"
            r="6.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray={status === 'todo' ? '2.6 1.8' : undefined}
          />
          {fill > 0 && (
            <circle
              cx="8"
              cy="8"
              r={r / 2}
              fill="none"
              stroke={color}
              strokeWidth={r}
              strokeDasharray={`${(c / 2) * fill} ${c}`}
              transform="rotate(-90 8 8)"
            />
          )}
        </>
      )}
    </svg>
  )
}

/** Signal-strength bars; high priority gets the warm accent. */
export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  const level = { low: 1, normal: 2, high: 3 }[priority]
  const active = priority === 'high' ? 'fill-orange-500' : 'fill-zinc-500'

  return (
    <svg viewBox="0 0 16 16" className={clsx('size-3.5 shrink-0', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3}
          width="3"
          height={4 + i * 3}
          rx="1"
          className={i < level ? active : 'fill-zinc-200'}
        />
      ))}
    </svg>
  )
}
