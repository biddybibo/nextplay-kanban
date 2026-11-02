import { clsx } from 'clsx'
import { AlertCircle, Plus } from 'lucide-react'
import { isOverdue } from '../lib/filters'
import type { Task } from '../lib/types'

type Props = {
  tasks: Task[] | undefined
  overdueOnly: boolean
  onToggleOverdue: () => void
  onNewTask: () => void
}

export function Header({ tasks, overdueOnly, onToggleOverdue, onNewTask }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="size-8" />
        <div className="min-w-0">
          <h1 className="text-[15px] leading-tight font-semibold text-zinc-900">My Board</h1>
          <p className="text-xs text-zinc-500">Guest workspace</p>
        </div>
      </div>

      {tasks && tasks.length > 0 && (
        <Stats tasks={tasks} overdueOnly={overdueOnly} onToggleOverdue={onToggleOverdue} />
      )}

      <button
        type="button"
        onClick={onNewTask}
        className="ml-auto flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 pr-2 pl-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
      >
        <Plus className="size-4" />
        New task
        <kbd className="ml-1 hidden rounded bg-white/15 px-1.5 font-sans text-[11px] leading-[18px] text-indigo-100 sm:inline">
          C
        </kbd>
      </button>
    </header>
  )
}

function Stats({ tasks, overdueOnly, onToggleOverdue }: Omit<Props, 'onNewTask' | 'tasks'> & { tasks: Task[] }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length
  const overdue = tasks.filter((t) => isOverdue(t)).length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="order-last flex w-full items-center gap-1 overflow-x-auto text-xs sm:order-none sm:w-auto">
      <div className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-zinc-200 bg-white pr-2.5 pl-2 shadow-card">
        <ProgressRing pct={pct} />
        <span className="text-zinc-700">
          <span className="font-semibold text-zinc-900 tabular-nums">{done}</span>
          <span className="text-zinc-400">/{total}</span> done
          <span className="ml-1.5 text-zinc-400 tabular-nums">{pct}%</span>
        </span>
      </div>
      <Stat label="Total" value={total} />
      <Stat label="Active" value={inProgress} />
      {overdue > 0 && (
        <button
          type="button"
          onClick={onToggleOverdue}
          aria-pressed={overdueOnly}
          title={overdueOnly ? 'Show all tasks' : 'Show only overdue tasks'}
          className={clsx(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-medium shadow-card transition-colors',
            overdueOnly
              ? 'border-red-300 bg-red-600 text-white hover:bg-red-500'
              : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70',
          )}
        >
          <AlertCircle className="size-3.5" />
          <span className="tabular-nums">{overdue}</span> overdue
        </button>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 px-2">
      <span className="font-semibold text-zinc-900 tabular-nums">{value}</span>
      <span className="text-zinc-500">{label.toLowerCase()}</span>
    </div>
  )
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 6
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden>
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-100" />
      {pct > 0 && <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="var(--color-status-done)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        className="transition-[stroke-dasharray] duration-500"
      />}
    </svg>
  )
}
