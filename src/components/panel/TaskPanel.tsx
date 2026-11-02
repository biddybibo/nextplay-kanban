import { forwardRef, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Plus, Trash2, X } from 'lucide-react'
import { useDeleteTask, useToggleRelation, useUpdateTask } from '../../hooks/useTasks'
import { useCreateLabel, useCreateMember } from '../../hooks/useWorkspaceLists'
import { dueUrgency } from '../../lib/due'
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Task } from '../../lib/types'
import { Avatar } from '../Avatar'
import { PriorityIcon, StatusIcon } from '../icons'
import { ColorDot, LabelChip } from '../LabelChip'
import { useLookups } from '../lookups'
import { MultiSelect } from '../MultiSelect'
import { CommentComposer, Feed } from './Feed'
import { PropertyMenu } from './PropertyMenu'

type Props = {
  task: Task | undefined
  onClose: () => void
}

export function TaskPanel({ task, onClose }: Props) {
  return (
    <Dialog.Root open={!!task} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/10" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            // First Esc leaves (and saves) the field being edited; the next one closes.
            const el = document.activeElement
            if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
              e.preventDefault()
              el.blur()
            }
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-full animate-panel-in flex-col bg-surface shadow-lifted ring-1 ring-zinc-950/5 focus:outline-none sm:inset-y-2 sm:right-2 sm:w-[min(540px,calc(100vw-1rem))] sm:rounded-xl"
        >
          {/* Keyed so drafts and confirm state reset when switching tasks. */}
          {task && <PanelBody key={task.id} task={task} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PanelBody({ task, onClose }: { task: Task; onClose: () => void }) {
  const { update } = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function onDelete() {
    onClose()
    deleteTask.mutate(task)
  }

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-100 px-4">
        <StatusIcon status={task.status} />
        <span className="text-xs text-zinc-500">
          Created {format(parseISO(task.created_at), 'MMM d, yyyy')}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {confirmingDelete ? (
            <div className="flex animate-fade-in items-center gap-1.5">
              <span className="text-xs text-zinc-600">Delete this task?</span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-7 rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                autoFocus
                className="h-7 rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          ) : (
            <IconButton label="Delete task" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="size-4" />
            </IconButton>
          )}
          <Dialog.Close asChild>
            <IconButton label="Close">
              <X className="size-4" />
            </IconButton>
          </Dialog.Close>
        </div>
      </header>

      <div ref={scrollRef} className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-6 pt-5 pb-6">
          <Dialog.Title className="sr-only">{task.title}</Dialog.Title>
          <EditableText
            value={task.title}
            onCommit={(title) => update(task.id, { title })}
            required
            singleLine
            maxLength={200}
            placeholder="Task title"
            label="Title"
            className="text-xl leading-snug font-semibold text-zinc-900"
          />
          <EditableText
            value={task.description ?? ''}
            onCommit={(description) => update(task.id, { description: description || null })}
            maxLength={5000}
            placeholder="Add a description…"
            label="Description"
            className="mt-2 min-h-16 text-sm leading-relaxed text-zinc-700"
          />

          <dl className="mt-5 grid grid-cols-[96px_1fr] items-center gap-y-1 border-t border-zinc-100 pt-4">
            <Property label="Status">
              <PropertyMenu
                label="Status"
                value={task.status}
                onChange={(status) => update(task.id, { status })}
                options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], icon: <StatusIcon status={s} /> }))}
              />
            </Property>
            <Property label="Priority">
              <PropertyMenu
                label="Priority"
                value={task.priority}
                onChange={(priority) => update(task.id, { priority })}
                options={PRIORITIES.map((p) => ({
                  value: p,
                  label: PRIORITY_LABELS[p],
                  icon: <PriorityIcon priority={p} />,
                }))}
              />
            </Property>
            <Property label="Due date">
              <DueDateField
                value={task.due_date}
                done={task.status === 'done'}
                onChange={(due_date) => update(task.id, { due_date })}
              />
            </Property>
            <Property label="Assignees">
              <AssigneesField task={task} />
            </Property>
            <Property label="Labels">
              <LabelsField task={task} />
            </Property>
          </dl>
        </div>

        <section className="flex-1 border-t border-zinc-100 bg-zinc-50/50 px-6 pt-5 pb-6">
          <h3 className="mb-4 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Activity</h3>
          <Feed taskId={task.id} />
        </section>
      </div>

      <footer className="shrink-0 border-t border-zinc-100 bg-surface p-3 sm:rounded-b-xl">
        <CommentComposer
          taskId={task.id}
          onPosted={() =>
            requestAnimationFrame(() =>
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }),
            )
          }
        />
      </footer>
    </>
  )
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[13px] text-zinc-500">{label}</dt>
      <dd className="-ml-2">{children}</dd>
    </>
  )
}

function IconButton({ label, children, ...props }: { label: string; children: ReactNode } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Text that edits in place and saves on blur. Escape (handled by the panel)
 * commits and leaves the field without closing the panel, like Linear/Notion.
 */
function EditableText({
  value,
  onCommit,
  required,
  singleLine,
  className,
  label,
  ...props
}: {
  value: string
  onCommit: (value: string) => void
  required?: boolean
  singleLine?: boolean
  className?: string
  label: string
  placeholder?: string
  maxLength?: number
}) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  // Follow outside changes (e.g. a failed save rolling back) while not editing.
  const shown = focused ? draft : value

  function commit() {
    setFocused(false)
    const next = singleLine ? draft.replace(/\s+/g, ' ').trim() : draft.trim()
    if (required && !next) return setDraft(value)
    if (next !== value) onCommit(next)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (singleLine && e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <textarea
      value={shown}
      onFocus={() => {
        setDraft(value)
        setFocused(true)
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      rows={1}
      aria-label={label}
      className={`-mx-2 block w-[calc(100%+1rem)] resize-none rounded-md px-2 py-1 transition-colors [field-sizing:content] placeholder:text-zinc-400 hover:bg-zinc-50 focus:bg-surface focus:ring-2 focus:ring-indigo-500/20 focus:outline-none ${className}`}
      {...props}
    />
  )
}

function DueDateField({
  value,
  done,
  onChange,
}: {
  value: string | null
  done: boolean
  onChange: (value: string | null) => void
}) {
  const urgency = value && !done ? dueUrgency(value) : 'later'
  const tone = { overdue: 'text-red-600', soon: 'text-amber-600', later: 'text-zinc-800' }[urgency]

  return (
    <div className="group flex items-center">
      <label className={`relative flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] transition-colors hover:bg-zinc-100 ${tone}`}>
        <CalendarDays className="size-3.5 opacity-70" />
        {value ? format(parseISO(value), 'EEE, MMM d, yyyy') : <span className="text-zinc-400">No due date</span>}
        {urgency === 'overdue' && <span className="text-xs font-medium">· Overdue</span>}
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          aria-label="Due date"
          // Invisible but clickable: the browser's own picker opens on click.
          className="absolute inset-0 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-0.5 grid size-6 place-items-center rounded text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Clear due date"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function AssigneesField({ task }: { task: Task }) {
  const { members, memberById } = useLookups()
  const { toggle } = useToggleRelation('assignee')
  const createMember = useCreateMember()
  const assigned = task.assignee_ids.flatMap((id) => memberById.get(id) ?? [])

  return (
    <MultiSelect
      trigger={
        <PickerTrigger label="Assignees" empty={assigned.length === 0} emptyText="Unassigned">
          {assigned.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <Avatar member={m} size="xs" />
              <span className="text-[13px] text-zinc-800">{m.name}</span>
            </span>
          ))}
        </PickerTrigger>
      }
      items={members.map((m) => ({ id: m.id, name: m.name, icon: <Avatar member={m} size="xs" /> }))}
      selected={task.assignee_ids}
      onToggle={(id) => toggle(task, id)}
      // New teammates are added to the team and assigned in one step.
      onCreate={(name) => toggle(task, createMember.create(name).id)}
      createNoun="teammate"
      placeholder="Assign to…"
      emptyText="Type a name to add a teammate"
    />
  )
}

function LabelsField({ task }: { task: Task }) {
  const { labels, labelById } = useLookups()
  const { toggle } = useToggleRelation('label')
  const createLabel = useCreateLabel()
  const applied = task.label_ids.flatMap((id) => labelById.get(id) ?? [])

  return (
    <MultiSelect
      trigger={
        <PickerTrigger label="Labels" empty={applied.length === 0} emptyText="Add labels">
          {applied.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </PickerTrigger>
      }
      items={labels.map((l) => ({ id: l.id, name: l.name, icon: <ColorDot color={l.color} /> }))}
      selected={task.label_ids}
      onToggle={(id) => toggle(task, id)}
      onCreate={(name) => toggle(task, createLabel.create(name).id)}
      createNoun="label"
      placeholder="Add label…"
      emptyText="Type to create a label"
    />
  )
}

const PickerTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<'button'> & { label: string; empty: boolean; emptyText: string }
>(function PickerTrigger({ label, empty, emptyText, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-1 text-left transition-colors outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500/40 data-[state=open]:bg-zinc-100"
      {...props}
    >
      {empty ? (
        <span className="flex items-center gap-1.5 text-[13px] text-zinc-400">
          <Plus className="size-3.5" />
          {emptyText}
        </span>
      ) : (
        children
      )}
    </button>
  )
})
