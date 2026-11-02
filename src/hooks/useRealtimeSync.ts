import { useEffect } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useUser } from '../auth/authContext'
import { supabase } from '../lib/supabase'

const DEBOUNCE_MS = 250

/**
 * Keeps this tab in sync with changes made elsewhere (another tab or device)
 * by listening to Postgres changes and refetching the affected queries.
 *
 * Refetching (rather than patching the cache from payloads) keeps one code
 * path for data shape and RLS. Our own writes echo back too; those refetches
 * are deferred until no local mutation is in flight, so they can't clobber
 * optimistic state mid-save.
 */
export function useRealtimeSync() {
  const user = useUser()
  const qc = useQueryClient()

  useEffect(() => {
    const pending = new Map<string, QueryKey>()
    let timer: ReturnType<typeof setTimeout> | undefined

    const flush = () => {
      if (qc.isMutating() > 0) {
        timer = setTimeout(flush, DEBOUNCE_MS)
        return
      }
      for (const key of pending.values()) void qc.invalidateQueries({ queryKey: key })
      pending.clear()
      timer = undefined
    }

    const schedule = (...keys: QueryKey[]) => {
      for (const key of keys) pending.set(JSON.stringify(key), key)
      clearTimeout(timer)
      timer = setTimeout(flush, DEBOUNCE_MS)
    }

    const tasks = ['tasks', user.id]
    // Table → queries to refetch. Assignee/label links live on the task rows.
    const routes: [string, QueryKey[]][] = [
      ['tasks', [tasks]],
      ['task_assignees', [tasks]],
      ['task_labels', [tasks]],
      ['comments', [['comments']]],
      ['task_activity', [['activity']]],
      ['team_members', [['team_members', user.id]]],
      ['labels', [['labels', user.id]]],
    ]

    const channel = supabase.channel(`board:${user.id}`)
    for (const [table, keys] of routes) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => schedule(...keys))
    }
    channel.subscribe()

    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [qc, user.id])
}
