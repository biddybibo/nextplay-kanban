import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '../auth/authContext'
import { nextColor } from '../lib/colors'
import { supabase } from '../lib/supabase'
import type { Label, Member, Task } from '../lib/types'
import { tasksKey, writeScope } from './useTasks'

// Team members and labels share a shape (id, name, color) and lifecycle,
// so both are driven by one set of hooks keyed by table.
type ListTable = 'team_members' | 'labels'
type ListRow = Member | Label

const LISTS = {
  team_members: { noun: 'team member', taskField: 'assignee_ids' },
  labels: { noun: 'label', taskField: 'label_ids' },
} as const

const listKey = (table: ListTable, userId: string) => [table, userId] as const

function useList<T extends ListRow>(table: ListTable) {
  const user = useUser()
  return useQuery({
    queryKey: listKey(table, user.id),
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data as T[]
    },
  })
}

function useCreateListItem<T extends ListRow>(table: ListTable) {
  const user = useUser()
  const qc = useQueryClient()
  const key = listKey(table, user.id)

  const mutation = useMutation({
    // Shares the task write queue: "create teammate, then assign them" must land in order.
    scope: writeScope,
    mutationFn: async (row: T) => {
      const { error } = await supabase.from(table).insert({ id: row.id, name: row.name, color: row.color })
      if (error) throw error
    },
    onError: (err: { message: string; code?: string }, row) => {
      qc.setQueryData<T[]>(key, (old = []) => old.filter((r) => r.id !== row.id))
      const description = err.code === '23505' ? `“${row.name}” already exists.` : err.message
      toast.error(`Couldn't add ${LISTS[table].noun}`, { description })
    },
  })

  /**
   * Returns the new row immediately (client-side id) so callers can use it
   * right away. The cache is updated synchronously, so rapid back-to-back
   * creates each see the previous one and pick distinct default colors.
   */
  const create = (name: string, color?: string): T => {
    const existing = qc.getQueryData<T[]>(key) ?? []
    const row = {
      id: crypto.randomUUID(),
      name,
      color: color ?? nextColor(existing.map((r) => r.color)),
      user_id: user.id,
      created_at: new Date().toISOString(),
    } as T
    void qc.cancelQueries({ queryKey: key })
    qc.setQueryData<T[]>(key, [...existing, row])
    mutation.mutate(row)
    return row
  }

  return { ...mutation, create }
}

function useDeleteListItem<T extends ListRow>(table: ListTable) {
  const user = useUser()
  const qc = useQueryClient()
  const key = listKey(table, user.id)
  const field = LISTS[table].taskField

  return useMutation({
    scope: writeScope,
    mutationFn: async (row: T) => {
      const { error } = await supabase.from(table).delete().eq('id', row.id)
      if (error) throw error
    },
    onMutate: async (row) => {
      await qc.cancelQueries({ queryKey: key })
      const tasks = qc.getQueryData<Task[]>(tasksKey(user.id))
      qc.setQueryData<T[]>(key, (old = []) => old.filter((r) => r.id !== row.id))
      // The DB cascades the join rows; mirror that on cached tasks.
      qc.setQueryData<Task[]>(tasksKey(user.id), (old = []) =>
        old.map((t) => (t[field].includes(row.id) ? { ...t, [field]: t[field].filter((id) => id !== row.id) } : t)),
      )
      return { tasks }
    },
    onError: (err, row, ctx) => {
      qc.setQueryData<T[]>(key, (old = []) => [...old, row].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      if (ctx?.tasks) qc.setQueryData(tasksKey(user.id), ctx.tasks)
      toast.error(`Couldn't remove ${LISTS[table].noun}`, { description: err.message })
    },
  })
}

export const useMembers = () => useList<Member>('team_members')
export const useCreateMember = () => useCreateListItem<Member>('team_members')
export const useDeleteMember = () => useDeleteListItem<Member>('team_members')

export const useLabels = () => useList<Label>('labels')
export const useCreateLabel = () => useCreateListItem<Label>('labels')
export const useDeleteLabel = () => useDeleteListItem<Label>('labels')
