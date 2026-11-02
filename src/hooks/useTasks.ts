import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '../auth/authContext'
import { positionBetween } from '../lib/position'
import { supabase } from '../lib/supabase'
import type { NewTask, Task, TaskPatch } from '../lib/types'

const tasksKey = (userId: string) => ['tasks', userId] as const

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
    mutationFn: async (input: NewTask & { position: number }) => {
      const { data, error } = await supabase.from('tasks').insert(input).select().single()
      if (error) throw error
      return data as Task
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Task[]>(key)
      const now = new Date().toISOString()
      const optimistic: Task = {
        id: `optimistic-${crypto.randomUUID()}`,
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
      qc.setQueryData<Task[]>(key, (old = []) => [...old, optimistic])
      return { previous, optimisticId: optimistic.id }
    },
    onSuccess: (task, _input, ctx) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === ctx.optimisticId ? task : t)))
    },
    onError: (_err, _input, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous)
    },
  })
}

/** Position that puts a new task at the bottom of `status`'s column. */
export function endOfColumnPosition(tasks: Task[], status: Task['status']): number {
  const inColumn = tasks.filter((t) => t.status === status)
  const last = inColumn.reduce<number | undefined>((max, t) => (max === undefined || t.position > max ? t.position : max), undefined)
  return positionBetween(last, undefined)
}

export function useUpdateTask() {
  const user = useUser()
  const qc = useQueryClient()
  const key = tasksKey(user.id)

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskPatch }) => {
      const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as Task
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Task[]>(key)
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      return { previous }
    },
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(key, (old = []) => old.map((t) => (t.id === task.id ? task : t)))
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous)
    },
  })
}

export function useDeleteTask() {
  const user = useUser()
  const qc = useQueryClient()
  const key = tasksKey(user.id)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Task[]>(key)
      qc.setQueryData<Task[]>(key, (old = []) => old.filter((t) => t.id !== id))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous)
    },
  })
}
