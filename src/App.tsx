import { useState, type FormEvent } from 'react'
import { useAuth } from './auth/authContext'
import { endOfColumnPosition, useCreateTask, useDeleteTask, useTasks, useUpdateTask } from './hooks/useTasks'
import { STATUSES, STATUS_LABELS, type TaskStatus } from './lib/types'

// Temporary Phase 1 screen: proves guest auth + CRUD through RLS.
// Replaced by the real board in Phase 2.

export default function App() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <Centered>Starting your guest session…</Centered>
  }
  if (auth.status === 'error') {
    return (
      <Centered>
        <p className="font-medium text-red-600">Couldn't start a guest session</p>
        <p className="mt-1 text-sm text-zinc-500">{auth.error.message}</p>
        <button onClick={auth.retry} className="mt-4 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
          Try again
        </button>
      </Centered>
    )
  }

  return <DataCheck userId={auth.user.id} />
}

function DataCheck({ userId }: { userId: string }) {
  const { data: tasks = [], isPending, error, refetch } = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [title, setTitle] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    createTask.mutate({ title: trimmed, position: endOfColumnPosition(tasks, 'todo') })
    setTitle('')
  }

  const mutationError = createTask.error ?? updateTask.error ?? deleteTask.error

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Data layer check</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">guest user: {userId}</p>

      <form onSubmit={onSubmit} className="mt-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
        />
        <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">Add</button>
      </form>

      {mutationError && <p className="mt-3 text-sm text-red-600">{mutationError.message}</p>}

      {isPending ? (
        <p className="mt-6 text-sm text-zinc-500">Loading tasks…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">
          {error.message}{' '}
          <button onClick={() => refetch()} className="underline">
            Retry
          </button>
        </p>
      ) : tasks.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No tasks yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="flex-1">{task.title}</span>
              <select
                value={task.status}
                onChange={(e) =>
                  updateTask.mutate({ id: task.id, patch: { status: e.target.value as TaskStatus } })
                }
                className="rounded border border-zinc-300 px-1 py-0.5"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button onClick={() => deleteTask.mutate(task.id)} className="text-zinc-400 hover:text-red-600">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center p-8 text-center">{children}</div>
}
