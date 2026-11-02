import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import { Check, Plus, Search } from 'lucide-react'

export type SelectItem = { id: string; name: string; icon?: ReactNode }

type Props = {
  /** The element that opens the picker; rendered via Popover.Trigger asChild. */
  trigger: ReactNode
  items: SelectItem[]
  selected: string[]
  onToggle: (id: string) => void
  /** When provided, typing a new name offers to create it. */
  onCreate?: (name: string) => void
  createNoun?: string
  placeholder?: string
  emptyText?: string
  align?: 'start' | 'end'
}

/** Searchable multi-select popover with full keyboard support (↑ ↓ Enter Esc). */
export function MultiSelect({
  trigger,
  items,
  selected,
  onToggle,
  onCreate,
  createNoun = 'item',
  placeholder = 'Search…',
  emptyText = 'Nothing here yet',
  align = 'start',
}: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const uid = useId()

  const q = query.trim()
  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  )
  const canCreate = !!onCreate && !!q && !items.some((i) => i.name.toLowerCase() === q.toLowerCase())
  const rowCount = filtered.length + (canCreate ? 1 : 0)
  const activeIndex = Math.min(active, Math.max(rowCount - 1, 0))

  function choose(index: number) {
    if (index < filtered.length) onToggle(filtered[index].id)
    else if (canCreate) {
      onCreate!(q)
      setQuery('')
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((activeIndex + 1) % Math.max(rowCount, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((activeIndex - 1 + rowCount) % Math.max(rowCount, 1))
    } else if (e.key === 'Enter' && rowCount > 0) {
      e.preventDefault()
      choose(activeIndex)
    }
  }

  return (
    <Popover.Root onOpenChange={(open) => !open && (setQuery(''), setActive(0))}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className="z-[60] w-60 animate-fade-in overflow-hidden rounded-lg bg-surface shadow-lifted ring-1 ring-zinc-950/5"
          onOpenAutoFocus={(e) => {
            // Focus the search box rather than the first focusable row.
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).querySelector('input')?.focus()
          }}
        >
          <div className="flex items-center gap-2 border-b border-zinc-100 px-2.5">
            <Search className="size-3.5 shrink-0 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              maxLength={60}
              role="combobox"
              aria-expanded
              aria-controls={`${uid}-list`}
              aria-activedescendant={rowCount ? `${uid}-row-${activeIndex}` : undefined}
              className="h-9 w-full bg-transparent text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>

          <ul id={`${uid}-list`} role="listbox" aria-multiselectable className="scroll-thin max-h-64 overflow-y-auto p-1">
            {filtered.map((item, i) => {
              const isSelected = selected.includes(item.id)
              return (
                <li
                  key={item.id}
                  id={`${uid}-row-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={clsx(
                    'flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] text-zinc-700 select-none',
                    i === activeIndex && 'bg-zinc-100',
                  )}
                >
                  <span
                    className={clsx(
                      'grid size-3.5 shrink-0 place-items-center rounded border transition-colors',
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-300 bg-surface',
                    )}
                  >
                    {isSelected && <Check className="size-2.5" strokeWidth={3} />}
                  </span>
                  {item.icon}
                  <span className="truncate">{item.name}</span>
                </li>
              )
            })}

            {canCreate && (
              <li
                id={`${uid}-row-${filtered.length}`}
                role="option"
                aria-selected={false}
                onMouseMove={() => setActive(filtered.length)}
                onClick={() => choose(filtered.length)}
                className={clsx(
                  'flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] text-zinc-700 select-none',
                  activeIndex === filtered.length && 'bg-zinc-100',
                )}
              >
                <Plus className="size-3.5 text-zinc-400" />
                <span className="truncate">
                  Create {createNoun} <span className="font-medium text-zinc-900">“{q}”</span>
                </span>
              </li>
            )}

            {rowCount === 0 && (
              <li className="px-2 py-3 text-center text-xs text-zinc-400">
                {q ? 'No matches' : emptyText}
              </li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
