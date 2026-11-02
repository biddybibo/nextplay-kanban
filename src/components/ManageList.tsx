import { useState, type FormEvent, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { PALETTE, nextColor } from '../lib/colors'

type Row = { id: string; name: string; color: string }

type Props<T extends Row> = {
  trigger: ReactNode
  title: string
  description: string
  rows: T[]
  /** Count of tasks using each row, shown so deletes aren't a surprise. */
  usage: (row: T) => number
  renderIcon: (row: Pick<T, 'name' | 'color'>) => ReactNode
  /** `color` is undefined when the user didn't pick one; the hook assigns a fresh one. */
  onCreate: (name: string, color?: string) => void
  onDelete: (row: T) => void
  placeholder: string
  emptyText: string
}

/** Popover for adding and removing team members or labels. */
export function ManageList<T extends Row>({
  trigger,
  title,
  description,
  rows,
  usage,
  renderIcon,
  onCreate,
  onDelete,
  placeholder,
  emptyText,
}: Props<T>) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const effectiveColor = color ?? nextColor(rows.map((r) => r.color))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed, color ?? undefined)
    setName('')
    setColor(null)
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-[60] w-72 animate-fade-in rounded-lg bg-white shadow-lifted ring-1 ring-zinc-950/5"
        >
          <div className="px-3.5 pt-3 pb-2">
            <p className="text-[13px] font-semibold text-zinc-900">{title}</p>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>

          <ul className="scroll-thin max-h-60 overflow-y-auto px-1.5">
            {rows.length === 0 && <li className="px-2 py-3 text-center text-xs text-zinc-400">{emptyText}</li>}
            {rows.map((row) => {
              const count = usage(row)
              return (
                <li key={row.id} className="group flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-zinc-50">
                  {renderIcon(row)}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-800">{row.name}</span>
                  {count > 0 && (
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      {count} {count === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="grid size-6 place-items-center rounded text-zinc-400 opacity-0 transition hover:bg-zinc-200/70 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Remove ${row.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>

          <form onSubmit={onSubmit} className="mt-1.5 border-t border-zinc-100 p-2.5">
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15">
              {renderIcon({ name: name.trim() || '?', color: effectiveColor })}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                maxLength={60}
                aria-label={placeholder}
                className="h-8 min-w-0 flex-1 bg-transparent text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="h-6 rounded bg-indigo-600 px-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5" role="radiogroup" aria-label="Color">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={effectiveColor === c}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={clsx(
                    'size-5 rounded-full transition-transform hover:scale-110',
                    effectiveColor === c && 'ring-2 ring-zinc-900/70 ring-offset-2',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
