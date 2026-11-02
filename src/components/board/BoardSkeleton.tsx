import { STATUSES } from '../../lib/types'

// Card counts vary per column so the skeleton reads as a board, not a grid.
const CARD_COUNTS = [3, 2, 1, 2]

export function BoardSkeleton() {
  return (
    <div className="flex h-full gap-3 overflow-hidden px-4 sm:px-6" aria-busy="true" aria-label="Loading board">
      {STATUSES.map((status, i) => (
        <div key={status} className="w-[85vw] shrink-0 rounded-xl bg-zinc-100/70 p-3 ring-1 ring-zinc-200/60 sm:w-[296px]">
          <div className="mb-3 flex items-center gap-2">
            <div className="size-3.5 animate-pulse rounded-full bg-zinc-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: CARD_COUNTS[i] }, (_, j) => (
              <div key={j} className="rounded-lg border border-zinc-200/80 bg-white p-3 shadow-card">
                <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
                <div className="mt-3 h-4 w-16 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
