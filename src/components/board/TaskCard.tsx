import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { clsx } from 'clsx'
import { PRIORITY_LABELS, type Task } from '../../lib/types'
import { AvatarStack } from '../Avatar'
import { DueDateChip } from '../DueDateChip'
import { LabelChip } from '../LabelChip'
import { useLookups } from '../lookups'
import { PriorityIcon } from '../icons'

type CardProps = {
  task: Task
  /** Rendered inside the DragOverlay, following the pointer. */
  overlay?: boolean
}

export const TaskCardView = memo(function TaskCardView({ task, overlay }: CardProps) {
  const done = task.status === 'done'
  const { memberById, labelById } = useLookups()
  const assignees = task.assignee_ids.flatMap((id) => memberById.get(id) ?? [])
  const labels = task.label_ids.flatMap((id) => labelById.get(id) ?? [])

  return (
    <div
      className={clsx(
        'group rounded-lg border bg-white p-3 text-left select-none',
        overlay
          ? 'rotate-[1.5deg] cursor-grabbing border-zinc-300 shadow-lifted'
          : 'cursor-grab border-zinc-200/80 shadow-card transition-[box-shadow,border-color] duration-150 hover:border-zinc-300 hover:shadow-card-hover',
      )}
    >
      <p
        className={clsx(
          'text-[13px] leading-snug font-medium break-words',
          done ? 'text-zinc-400 line-through decoration-zinc-300' : 'text-zinc-800',
        )}
      >
        {task.title}
      </p>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{task.description}</p>
      )}

      {/* Normal priority is the default, so it isn't shown; cards stay quiet unless something is notable. */}
      {(task.priority !== 'normal' || task.due_date || labels.length > 0 || assignees.length > 0) && (
        <div className="mt-2.5 flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {task.priority !== 'normal' && (
              <span
                className={clsx(
                  'inline-flex h-5 items-center gap-1 rounded-md text-[11px] font-medium',
                  task.priority === 'high' ? 'text-orange-600' : 'text-zinc-500',
                )}
                title={`${PRIORITY_LABELS[task.priority]} priority`}
              >
                <PriorityIcon priority={task.priority} />
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}
            {task.due_date && <DueDateChip dueDate={task.due_date} done={done} />}
            {labels.map((l) => (
              <LabelChip key={l.id} label={l} />
            ))}
          </div>
          {assignees.length > 0 && <AvatarStack members={assignees} />}
        </div>
      )}
    </div>
  )
})

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx(
        'touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
        // The original stays in place as a dashed slot while the overlay moves.
        isDragging && 'opacity-40 [&>div]:border-dashed [&>div]:border-zinc-300 [&>div]:shadow-none',
      )}
      {...attributes}
      {...listeners}
      // Mouse drags need 6px of movement, so a plain click still lands here.
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        // Enter opens; Space is left to the keyboard sensor for picking the card up.
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen(task.id)
          return
        }
        listeners?.onKeyDown?.(e)
      }}
      aria-label={`Task: ${task.title}`}
    >
      <TaskCardView task={task} />
    </div>
  )
}
