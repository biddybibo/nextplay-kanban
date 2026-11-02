import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { endOfColumnPosition, useCreateTask, useNewTaskFactory, useUpdateTask } from '../../hooks/useTasks'
import { positionBetween } from '../../lib/position'
import { STATUSES, STATUS_LABELS, type Task, type TaskStatus } from '../../lib/types'
import { Column } from './Column'
import { TaskCardView } from './TaskCard'

type Columns = Record<TaskStatus, string[]>

function groupIds(tasks: Task[]): Columns {
  const cols: Columns = { todo: [], in_progress: [], in_review: [], done: [] }
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[t.status].push(t.id)
  return cols
}

function findColumn(id: UniqueIdentifier, cols: Columns): TaskStatus | undefined {
  if ((STATUSES as readonly UniqueIdentifier[]).includes(id)) return id as TaskStatus
  return STATUSES.find((s) => cols[s].includes(id as string))
}

/**
 * Card order during a drag lives in local state; the query cache is only
 * written once, on drop. After the drop we keep showing the dropped
 * arrangement until the cache catches up (`base !== grouped`), so the card
 * never flickers back to where it started.
 */
type DragState = { cols: Columns; base: Columns }

type BoardProps = {
  /** Tasks to show (after filters). */
  tasks: Task[]
  /** Every task, for computing positions of new cards. */
  allTasks: Task[]
  filtering: boolean
  onOpenTask: (id: string) => void
}

export function Board({ tasks, allTasks, filtering, onOpenTask }: BoardProps) {
  const { update } = useUpdateTask()
  const createTask = useCreateTask()
  const makeTask = useNewTaskFactory()

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const grouped = useMemo(() => groupIds(tasks), [tasks])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const columns = drag && (activeId || drag.base === grouped) ? drag.cols : grouped
  const activeTask = activeId ? byId.get(activeId) : undefined

  const sensors = useSensors(
    // A small distance keeps plain clicks working (they'll open the task).
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the board can still be scrolled with a finger.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter is reserved for opening a card; Space picks it up.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setDrag({ cols: grouped, base: grouped })
  }

  // Moving between columns happens live, so the target column opens a gap.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    setDrag((prev) => {
      if (!prev) return prev
      const cols = prev.cols
      const from = findColumn(active.id, cols)
      const to = findColumn(over.id, cols)
      if (!from || !to || from === to) return prev

      const target = cols[to]
      const overIndex = target.indexOf(over.id as string)
      const translated = active.rect.current.translated
      const below = translated && translated.top > over.rect.top + over.rect.height / 2
      const insertAt = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length

      return {
        ...prev,
        cols: {
          ...cols,
          [from]: cols[from].filter((id) => id !== active.id),
          [to]: [...target.slice(0, insertAt), active.id as string, ...target.slice(insertAt)],
        },
      }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    const task = byId.get(active.id as string)
    if (!over || !drag || !task) {
      setDrag(null)
      return
    }

    const status = findColumn(active.id, drag.cols)!
    let ids = drag.cols[status]
    // Reordering within a column is applied here rather than in onDragOver.
    if (findColumn(over.id, drag.cols) === status && over.id !== active.id && ids.includes(over.id as string)) {
      ids = arrayMove(ids, ids.indexOf(task.id), ids.indexOf(over.id as string))
    }

    const index = ids.indexOf(task.id)
    const unchanged =
      status === task.status &&
      grouped[status].length === ids.length &&
      grouped[status].every((id, i) => id === ids[i])
    if (unchanged) {
      setDrag(null)
      return
    }

    const before = byId.get(ids[index - 1])
    const after = byId.get(ids[index + 1])
    setDrag({ cols: { ...drag.cols, [status]: ids }, base: grouped })
    update(task.id, { status, position: positionBetween(before?.position, after?.position) })
  }

  function onQuickAdd(status: TaskStatus, title: string) {
    createTask.mutate(makeTask({ title, status, position: endOfColumnPosition(allTasks, status) }))
    if (filtering) toast('Task created', { description: 'It may be hidden by your current filters.' })
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${byId.get(active.id as string)?.title ?? 'task'}.`,
    onDragOver: ({ over }) => (over && drag ? `Over ${STATUS_LABELS[findColumn(over.id, drag.cols)!]}.` : ''),
    onDragEnd: ({ active, over }) =>
      over && drag
        ? `Dropped ${byId.get(active.id as string)?.title ?? 'task'} in ${STATUS_LABELS[findColumn(active.id, drag.cols)!]}.`
        : 'Drop cancelled.',
    onDragCancel: () => 'Drag cancelled. The task was returned to where it started.',
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setDrag(null)
      }}
      accessibility={{ announcements }}
    >
      <div className="scroll-thin flex h-full snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-4 sm:snap-none sm:px-6">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status].map((id) => byId.get(id)).filter((t): t is Task => !!t)}
            dragging={activeId !== null}
            onQuickAdd={onQuickAdd}
            onOpenTask={onOpenTask}
            filtering={filtering}
          />
        ))}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 180,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
        }}
      >
        {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
