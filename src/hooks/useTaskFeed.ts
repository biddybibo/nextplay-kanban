import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '../auth/authContext'
import type { Tables } from '../lib/database.types'
import { supabase } from '../lib/supabase'

export type Comment = Tables<'comments'>
export type Activity = Tables<'task_activity'>

export const commentsKey = (taskId: string) => ['comments', taskId] as const
export const activityKey = (taskId: string) => ['activity', taskId] as const

export function useComments(taskId: string) {
  return useQuery({
    queryKey: commentsKey(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Rows are written by DB triggers on tasks / task_assignees / task_labels. */
export function useActivity(taskId: string) {
  return useQuery({
    queryKey: activityKey(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useAddComment(taskId: string) {
  const user = useUser()
  const qc = useQueryClient()
  const key = commentsKey(taskId)

  const mutation = useMutation({
    mutationFn: async (comment: Comment) => {
      const { id, body, task_id } = comment
      const { data, error } = await supabase.from('comments').insert({ id, body, task_id }).select().single()
      if (error) throw error
      return data
    },
    onMutate: async (comment) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<Comment[]>(key, (old = []) => [...old, comment])
    },
    onSuccess: (comment) => {
      qc.setQueryData<Comment[]>(key, (old = []) => old.map((c) => (c.id === comment.id ? comment : c)))
    },
    onError: (err, comment) => {
      qc.setQueryData<Comment[]>(key, (old = []) => old.filter((c) => c.id !== comment.id))
      toast.error("Couldn't post comment", { description: err.message })
    },
  })

  // Client-generated id so the optimistic comment and the saved row share a key.
  const post = (body: string) =>
    mutation.mutate({
      id: crypto.randomUUID(),
      body,
      task_id: taskId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    })

  return { ...mutation, post }
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient()
  const key = commentsKey(taskId)

  return useMutation({
    mutationFn: async (comment: Comment) => {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id)
      if (error) throw error
    },
    onMutate: async (comment) => {
      await qc.cancelQueries({ queryKey: key })
      qc.setQueryData<Comment[]>(key, (old = []) => old.filter((c) => c.id !== comment.id))
    },
    onError: (err, comment) => {
      qc.setQueryData<Comment[]>(key, (old = []) =>
        [...old, comment].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      )
      toast.error("Couldn't delete comment", { description: err.message })
    },
  })
}
