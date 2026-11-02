import { forwardRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { clsx } from 'clsx'
import { ChevronDown, X } from 'lucide-react'
import { endOfColumnPosition, useCreateTask, useNewTaskFactory } from '../hooks/useTasks'
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Task, type TaskPriority, type TaskStatus } from '../lib/types'
import { useCreateLabel, useCreateMember } from '../hooks/useWorkspaceLists'
import { Avatar, AvatarStack } from './Avatar'
import { PriorityIcon, StatusIcon } from './icons'
import { ColorDot, LabelChip } from './LabelChip'
import { useLookups } from './lookups'
import { MultiSelect } from './MultiSelect'

const toggleIn = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
}

export function CreateTaskDialog({ open, onOpenChange, tasks }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-zinc-950/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-dialog-in rounded-xl bg-white shadow-lifted ring-1 ring-zinc-950/5 focus:outline-none"
          aria-describedby={undefined}
        >
          {/* Remounted on every open so the form always starts blank. */}
          {open && <CreateTaskForm tasks={tasks} onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CreateTaskForm({ tasks, onDone }: { tasks: Task[]; onDone: () => void }) {
  const createTask = useCreateTask()
  const makeTask = useNewTaskFactory()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [touched, setTouched] = useState(false)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [labelIds, setLabelIds] = useState<string[]>([])
  const { members, labels, memberById, labelById } = useLookups()
  const createMember = useCreateMember()
  const createLabel = useCreateLabel()

  const titleError = touched && !title.trim() ? 'Give the task a title' : null

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const trimmed = title.trim()
    if (!trimmed) return

    createTask.mutate(
      makeTask({
        title: trimmed,
        description: description.trim() || null,
        status,
        priority,
        due_date: dueDate || null,
        assignee_ids: assigneeIds,
        label_ids: labelIds,
        position: endOfColumnPosition(tasks, status),
      }),
    )
    onDone()
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
        <Dialog.Title className="text-sm font-semibold text-zinc-900">New task</Dialog.Title>
        <Dialog.Close className="grid size-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </div>

      <div className="space-y-5 px-5 py-4">
        <div>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title && setTouched(true)}
            maxLength={200}
            placeholder="Task title"
            aria-label="Title"
            aria-invalid={!!titleError}
            className="w-full bg-transparent text-lg font-semibold text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
          />
          {titleError && <p className="mt-1 text-xs text-red-600">{titleError}</p>}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Add a description…"
            aria-label="Description"
            className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>

        <Field label="Status">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <Choice key={s} selected={status === s} onClick={() => setStatus(s)}>
                <StatusIcon status={s} />
                {STATUS_LABELS[s]}
              </Choice>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <Field label="Priority">
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITIES.map((p) => (
                <Choice key={p} selected={priority === p} onClick={() => setPriority(p)}>
                  <PriorityIcon priority={p} />
                  {PRIORITY_LABELS[p]}
                </Choice>
              ))}
            </div>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-[13px] text-zinc-700 transition-colors hover:border-zinc-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Assignees">
            <MultiSelect
              trigger={
                <PickerButton placeholder="Unassigned" empty={assigneeIds.length === 0}>
                  <AvatarStack members={assigneeIds.flatMap((id) => memberById.get(id) ?? [])} max={5} />
                  {assigneeIds.length === 1 && (
                    <span className="truncate text-zinc-700">{memberById.get(assigneeIds[0])?.name}</span>
                  )}
                </PickerButton>
              }
              items={members.map((m) => ({ id: m.id, name: m.name, icon: <Avatar member={m} size="xs" /> }))}
              selected={assigneeIds}
              onToggle={(id) => setAssigneeIds((ids) => toggleIn(ids, id))}
              onCreate={(name) => {
                const m = createMember.create(name)
                setAssigneeIds((ids) => [...ids, m.id])
              }}
              createNoun="teammate"
              placeholder="Assign to…"
              emptyText="Type a name to add a teammate"
            />
          </Field>
          <Field label="Labels">
            <MultiSelect
              trigger={
                <PickerButton placeholder="No labels" empty={labelIds.length === 0}>
                  {labelIds.flatMap((id) => labelById.get(id) ?? []).map((l) => (
                    <LabelChip key={l.id} label={l} />
                  ))}
                </PickerButton>
              }
              items={labels.map((l) => ({ id: l.id, name: l.name, icon: <ColorDot color={l.color} /> }))}
              selected={labelIds}
              onToggle={(id) => setLabelIds((ids) => toggleIn(ids, id))}
              onCreate={(name) => {
                const l = createLabel.create(name)
                setLabelIds((ids) => [...ids, l.id])
              }}
              createNoun="label"
              placeholder="Add label…"
              emptyText="Type to create a label"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
        <Dialog.Close className="h-8 rounded-md px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100">
          Cancel
        </Dialog.Close>
        <button
          type="submit"
          className="h-8 rounded-md bg-indigo-600 px-3.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
        >
          Create task
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      {children}
    </div>
  )
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[12px] font-medium whitespace-nowrap transition-colors',
        selected
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
      )}
    >
      {children}
    </button>
  )
}

const PickerButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<'button'> & { placeholder: string; empty: boolean }
>(function PickerButton({ placeholder, empty, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="flex h-8 w-full items-center gap-1.5 overflow-hidden rounded-md border border-zinc-200 bg-white px-2 text-left text-[13px] transition-colors hover:border-zinc-300 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/15 focus-visible:outline-none data-[state=open]:border-indigo-400"
      {...props}
    >
      {empty ? <span className="text-zinc-400">{placeholder}</span> : children}
      <ChevronDown className="ml-auto size-3.5 shrink-0 text-zinc-400" />
    </button>
  )
})
