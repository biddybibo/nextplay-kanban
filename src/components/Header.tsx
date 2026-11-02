import { Plus } from 'lucide-react'

export function Header({ onNewTask, taskCount }: { onNewTask: () => void; taskCount?: number }) {
  return (
    <header className="flex items-center gap-3 px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
      <img src="/favicon.svg" alt="" className="size-8" />
      <div className="min-w-0">
        <h1 className="text-[15px] leading-tight font-semibold text-zinc-900">My Board</h1>
        <p className="text-xs text-zinc-500">
          Guest workspace{taskCount !== undefined && ` · ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`}
        </p>
      </div>

      <button
        type="button"
        onClick={onNewTask}
        className="ml-auto flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 pr-2 pl-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
      >
        <Plus className="size-4" />
        New task
        <kbd className="ml-1 hidden rounded bg-white/15 px-1.5 font-sans text-[11px] leading-[18px] text-indigo-100 sm:inline">
          C
        </kbd>
      </button>
    </header>
  )
}
