import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CloudOff, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from './auth/authContext'
import { Board } from './components/board/Board'
import { BoardSkeleton } from './components/board/BoardSkeleton'
import { CreateTaskDialog } from './components/CreateTaskDialog'
import { Header } from './components/Header'
import { LookupContext, buildLookups } from './components/lookups'
import { TaskPanel } from './components/panel/TaskPanel'
import { Toolbar } from './components/Toolbar'
import { useTaskParam } from './hooks/useTaskParam'
import { useTasks } from './hooks/useTasks'
import { useLabels, useMembers } from './hooks/useWorkspaceLists'
import { EMPTY_FILTERS, hasActiveFilters, matchesFilters, type Filters } from './lib/filters'

export default function App() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return (
      <FullScreenMessage icon={<Loader2 className="size-5 animate-spin text-indigo-500" />} title="Setting up your board…">
        Creating a private guest workspace.
      </FullScreenMessage>
    )
  }

  if (auth.status === 'error') {
    return (
      <FullScreenMessage
        icon={<CloudOff className="size-5 text-red-500" />}
        title="Couldn't start your session"
        action={<RetryButton onClick={auth.retry} />}
      >
        {auth.error.message}
      </FullScreenMessage>
    )
  }

  return <Workspace />
}

function Workspace() {
  const tasksQuery = useTasks()
  const membersQuery = useMembers()
  const labelsQuery = useLabels()
  const tasks = tasksQuery.data
  const [creating, setCreating] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [openTaskId, setOpenTaskId] = useTaskParam()
  // Undefined while loading, or if the task was deleted / the URL is stale.
  const openTask = openTaskId ? tasks?.find((t) => t.id === openTaskId) : undefined

  const lookups = useMemo(
    () => buildLookups(membersQuery.data ?? [], labelsQuery.data ?? []),
    [membersQuery.data, labelsQuery.data],
  )
  const filtering = hasActiveFilters(filters)
  const visibleTasks = useMemo(
    () => (tasks && filtering ? tasks.filter((t) => matchesFilters(t, filters)) : tasks),
    [tasks, filters, filtering],
  )

  // "C" opens the composer, unless the user is typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setCreating(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loading = tasksQuery.isPending || membersQuery.isPending || labelsQuery.isPending
  const error = tasksQuery.error ?? membersQuery.error ?? labelsQuery.error
  const retry = () => {
    if (tasksQuery.error) void tasksQuery.refetch()
    if (membersQuery.error) void membersQuery.refetch()
    if (labelsQuery.error) void labelsQuery.refetch()
  }

  return (
    <LookupContext.Provider value={lookups}>
      <div className="flex h-full flex-col">
        <Header
          tasks={tasks}
          overdueOnly={filters.overdueOnly}
          onToggleOverdue={() => setFilters((f) => ({ ...f, overdueOnly: !f.overdueOnly }))}
          onNewTask={() => setCreating(true)}
        />

        {tasks && tasks.length === 0 ? (
          <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[13px] text-indigo-900 sm:mx-6">
            <Sparkles className="size-4 shrink-0 text-indigo-500" />
            <p>
              Your board is empty. Add your first task with <span className="font-medium">New task</span>, or press{' '}
              <kbd className="rounded border border-indigo-200 bg-white px-1 font-sans text-[11px] font-medium">C</kbd>.
            </p>
          </div>
        ) : (
          tasks && (
            <Toolbar
              filters={filters}
              onChange={setFilters}
              members={lookups.members}
              labels={lookups.labels}
              tasks={tasks}
              visibleCount={visibleTasks?.length ?? 0}
            />
          )
        )}

        <main className="min-h-0 flex-1">
          {loading ? (
            <BoardSkeleton />
          ) : error ? (
            <FullScreenMessage
              icon={<CloudOff className="size-5 text-red-500" />}
              title="Couldn't load your board"
              action={<RetryButton onClick={retry} loading={tasksQuery.isRefetching} />}
            >
              {error.message}
            </FullScreenMessage>
          ) : (
            <Board
              tasks={visibleTasks!}
              allTasks={tasks!}
              filtering={filtering}
              onOpenTask={setOpenTaskId}
            />
          )}
        </main>

        <CreateTaskDialog open={creating} onOpenChange={setCreating} tasks={tasks ?? []} />
        <TaskPanel task={openTask} onClose={() => setOpenTaskId(null)} />
      </div>
    </LookupContext.Provider>
  )
}

function FullScreenMessage({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 grid size-10 place-items-center rounded-full bg-white shadow-card ring-1 ring-zinc-200">{icon}</div>
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function RetryButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-60"
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      Try again
    </button>
  )
}
