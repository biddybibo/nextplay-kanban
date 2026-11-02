import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { clsx } from 'clsx'
import { Plus } from 'lucide-react'
import { STATUS_LABELS, type Task, type TaskStatus } from '../../lib/types'
import { StatusIcon } from '../icons'
import { SortableTaskCard } from './TaskCard'

const EMPTY_COPY: Record<TaskStatus, string> = {
  todo: 'Nothing planned yet',
  in_progress: 'Nothing in flight',
  in_review: 'Nothing waiting on review',
  done: 'Finished work lands here',
}

type ColumnProps = {
  status: TaskStatus
  tasks: Task[]
  /** True while any card is being dragged; empty columns turn into drop targets. */
  dragging: boolean
  onQuickAdd: (status: TaskStatus, title: string) => void
  onOpenTask: (id: string) => void
  filtering: boolean
}

export function Column({ status, tasks, dragging, onQuickAdd, onOpenTask, filtering }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column', status } })
  const [adding, setAdding] = useState(false)

  return (
    <section
      aria-label={STATUS_LABELS[status]}
      className={clsx(
        'flex max-h-full w-[85vw] shrink-0 snap-center flex-col rounded-xl bg-zinc-100/70 ring-1 ring-zinc-200/60 transition-colors sm:w-[296px] sm:snap-start',
        isOver && 'bg-indigo-50/60 ring-indigo-200',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <StatusIcon status={status} />
        <h2 className="text-[13px] font-semibold text-zinc-700">{STATUS_LABELS[status]}</h2>
        <span className="rounded-full bg-zinc-200/70 px-1.5 text-[11px] leading-[18px] font-medium text-zinc-500 tabular-nums">
          {tasks.length}
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ml-auto grid size-6 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700"
          aria-label={`Add task to ${STATUS_LABELS[status]}`}
        >
          <Plus className="size-4" />
        </button>
      </header>

      <div ref={setNodeRef} className="scroll-thin flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !adding && (
          <div
            className={clsx(
              'flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
              dragging ? 'border-indigo-300 bg-surface/60 text-indigo-500' : 'border-zinc-300/80 text-zinc-400',
            )}
          >
            <StatusIcon status={status} className="mb-2 size-5 opacity-60" />
            <p className="text-xs font-medium">{dragging ? 'Drop here' : filtering ? 'No matching tasks' : EMPTY_COPY[status]}</p>
          </div>
        )}

        {adding ? (
          <QuickAdd
            onSubmit={(title) => onQuickAdd(status, title)}
            onClose={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800"
          >
            <Plus className="size-3.5" />
            Add task
          </button>
        )}
      </div>
    </section>
  )
}

/** Inline title-only composer. Enter adds and stays open for the next one; Esc or blur closes. */
function QuickAdd({ onSubmit, onClose }: { onSubmit: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  function submit() {
    const trimmed = title.trim()
    if (trimmed) onSubmit(trimmed)
    setTitle('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="rounded-lg border border-indigo-300 bg-surface p-2 shadow-card ring-2 ring-indigo-500/15">
      <textarea
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          submit()
          onClose()
        }}
        rows={2}
        maxLength={200}
        placeholder="What needs doing?"
        className="w-full resize-none bg-transparent text-[13px] leading-snug text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
      />
      <p className="mt-1 text-[11px] text-zinc-400">
        <kbd className="font-sans font-medium text-zinc-500">Enter</kbd> to add ·{' '}
        <kbd className="font-sans font-medium text-zinc-500">Esc</kbd> to close
      </p>
    </div>
  )
}
