import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '../auth/authContext'
import { positionBetween } from '../lib/position'
import { supabase } from '../lib/supabase'
import type { NewTask, Task, TaskPatch } from '../lib/types'

export const tasksKey = (userId: string) => ['tasks', userId] as const

// Task writes run one at a time, in order. Otherwise an edit made while a
// card's insert is still in flight could reach the DB before the row exists.
export const writeScope = { id: 'task-writes' }

// Assignees and labels come back embedded, so the board needs one request.
const TASK_SELECT = '*, task_assignees(member_id), task_labels(label_id)'

type TaskRow = Omit<Task, 'assignee_ids' | 'label_ids'> & {
  task_assignees: { member_id: string }[]
  task_labels: { label_id: string }[]
}

function normalize({ task_assignees, task_labels, ...task }: TaskRow): Task {
  return {
    ...task,
    assignee_ids: task_assignees.map((a) => a.member_id),
    label_ids: task_labels.map((l) => l.label_id),
  }
}

async function fetchTasks(): Promise<Task[]> {
  // RLS already limits rows to the signed-in user; no user_id filter needed.
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('position', { ascending: true })
  if (error) throw error
  return (data as unknown as TaskRow[]).map(normalize)
}

export function useTasks() {
  const user = useUser()
  return useQuery({ queryKey: tasksKey(user.id), queryFn: fetchTasks })
}

export function useCreateTask() {
  const user = useUser()
  const qc = useQueryClient()
  const key = tasksKey(user.id)

  return useMutation({
    scope: writeScope,
    mutationFn: async (input: Task) => {
      const { id, title, description, status, priority, due_date, position, assignee_ids, label_ids } = input
      const { error } = await supabase
        .from('tasks')
        .insert({ id, title, description, status, priority, due_date, position })
      if (error) throw error

      const links = await Promise.all([
        assignee_ids.length
          ? supabase.from('task_assignees').insert(assignee_ids.map((member_id) => ({ task_id: id, member_id })))
          : null,
        label_ids.length
          ? supabase.from('task_labels').insert(label_ids.map((label_id) => ({ task_id: id, label_id })))
          : null,
      ])
      const linkError = links.find((r) => r?.error)?.error
      if (linkError) throw linkError

      const { data, error: readError } = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).single()
      if (readError) throw readError
      return normalize(data as unknown as TaskRow)
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<Task[]>(key, (old = []) => [...old, task])
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === task.id ? task : t)))
    },
    onError: (err, task) => {
      // The insert may have half-succeeded (task saved, links failed); refetch to show the truth.
      qc.setQueryData<Task[]>(key, (old = []) => old.filter((t) => t.id !== task.id))
      void qc.invalidateQueries({ queryKey: key })
      toast.error("Couldn't create task", { description: err.message })
    },
  })
}

/**
 * Returns a function that builds a full optimistic Task from user input.
 * The id is generated client-side, so the card is immediately usable
 * (draggable, editable) before the insert round-trips.
 */
export function useNewTaskFactory() {
  const user = useUser()
  return useCallback(
    (input: NewTask & { position: number }): Task => {
      const now = new Date().toISOString()
      return {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'normal',
        due_date: input.due_date ?? null,
        position: input.position,
        assignee_ids: input.assignee_ids ?? [],
        label_ids: input.label_ids ?? [],
        user_id: user.id,
        created_at: now,
        updated_at: now,
      }
    },
    [user.id],
  )
}

/** Position that puts a new task at the bottom of `status`'s column. */
export function endOfColumnPosition(tasks: Task[], status: Task['status']): number {
  let last: number | undefined
  for (const t of tasks) {
    if (t.status === status && (last === undefined || t.position > last)) last = t.position
  }
  return positionBetween(last, undefined)
}

export function useUpdateTask() {
  const user = useUser()
  const qc = useQueryClient()
  const key = tasksKey(user.id)

  const mutation = useMutation({
    scope: writeScope,
    mutationFn: async ({ id, patch }: { id: string; patch: TaskPatch; previous: Task }) => {
      const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select(TASK_SELECT).single()
      if (error) throw error
      return normalize(data as unknown as TaskRow)
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === task.id ? task : t)))
      // A trigger may have logged this change; refresh the task's timeline.
      void qc.invalidateQueries({ queryKey: ['activity', task.id] })
    },
    onError: (err, { previous }) => {
      // Roll back only this task so concurrent edits to other cards survive.
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === previous.id ? previous : t)))
      toast.error("Couldn't save changes", { description: err.message })
    },
  })

  const { mutate } = mutation
  // The cache is patched synchronously (not in onMutate, which runs a tick
  // later) so a dropped card never flashes back to its old column.
  const update = useCallback(
    (id: string, patch: TaskPatch) => {
      const k = tasksKey(user.id)
      const previous = qc.getQueryData<Task[]>(k)?.find((t) => t.id === id)
      if (!previous) return
      void qc.cancelQueries({ queryKey: k })
      qc.setQueryData<Task[]>(k, (old = []) => old.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      mutate({ id, patch, previous })
    },
    [qc, mutate, user.id],
  )

  return { ...mutation, update }
}

const RELATIONS = {
  assignee: { table: 'task_assignees', column: 'member_id', field: 'assignee_ids' },
  label: { table: 'task_labels', column: 'label_id', field: 'label_ids' },
} as const

/** Adds or removes one assignee / label on a task, optimistically. */
export function useToggleRelation(kind: keyof typeof RELATIONS) {
  const user = useUser()
  const qc = useQueryClient()
  const key = tasksKey(user.id)
  const { table, column, field } = RELATIONS[kind]

  const setLinked = (taskId: string, id: string, linked: boolean) =>
    qc.setQueryData<Task[]>(key, (old = []) =>
      old.map((t) =>
        t.id !== taskId
          ? t
          : { ...t, [field]: linked ? [...new Set([...t[field], id])] : t[field].filter((x) => x !== id) },
      ),
    )

  const mutation = useMutation({
    scope: writeScope,
    mutationFn: async ({ taskId, id, add }: { taskId: string; id: string; add: boolean }) => {
      const { error } = add
        ? await supabase.from(table).insert({ task_id: taskId, [column]: id } as never)
        : await supabase.from(table).delete().match({ task_id: taskId, [column]: id })
      if (error) throw error
    },
    onSuccess: (_data, { taskId }) => {
      void qc.invalidateQueries({ queryKey: ['activity', taskId] })
    },
    onError: (err, { taskId, id, add }) => {
      setLinked(taskId, id, !add)
      toast.error(`Couldn't update ${kind === 'assignee' ? 'assignees' : 'labels'}`, { description: err.message })
    },
  })

  const { mutate } = mutation
  const toggle = (task: Task, id: string) => {
    const add = !task[field].includes(id)
    setLinked(task.id, id, add)
    mutate({ taskId: task.id, id, add })
  }

  return { ...mutation, toggle }
}

export function useDeleteTask() {
  const user = useUser()
  const qc = useQueryClient()
  const key = tasksKey(user.id)

  return useMutation({
    scope: writeScope,
    mutationFn: async (task: Task) => {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id)
      if (error) throw error
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<Task[]>(key, (old = []) => old.filter((t) => t.id !== task.id))
    },
    onError: (err, task) => {
      qc.setQueryData<Task[]>(key, (old = []) => [...old, task])
      toast.error("Couldn't delete task", { description: err.message })
    },
  })
}
