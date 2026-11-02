import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '../auth/authContext'
import { positionBetween } from '../lib/position'
import { supabase } from '../lib/supabase'
import type { NewTask, Task, TaskPatch } from '../lib/types'

const tasksKey = (userId: string) => ['tasks', userId] as const

// Task writes run one at a time, in order. Otherwise an edit made while a
// card's insert is still in flight could reach the DB before the row exists.
const writeScope = { id: 'task-writes' }

async function fetchTasks(): Promise<Task[]> {
  // RLS already limits rows to the signed-in user; no user_id filter needed.
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data as Task[]
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
      const { id, title, description, status, priority, due_date, position } = input
      const { data, error } = await supabase
        .from('tasks')
        .insert({ id, title, description, status, priority, due_date, position })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<Task[]>(key, (old = []) => [...old, task])
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === task.id ? task : t)))
    },
    onError: (err, task) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.filter((t) => t.id !== task.id))
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
      const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === task.id ? task : t)))
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
