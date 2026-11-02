import { forwardRef, useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, Search, Tag, Users, X } from 'lucide-react'
import { useCreateLabel, useCreateMember, useDeleteLabel, useDeleteMember } from '../hooks/useWorkspaceLists'
import { EMPTY_FILTERS, UNASSIGNED, hasActiveFilters, type Filters } from '../lib/filters'
import { PRIORITIES, PRIORITY_LABELS, type Label, type Member, type Task } from '../lib/types'
import { Avatar, AvatarStack } from './Avatar'
import { PriorityIcon } from './icons'
import { ColorDot } from './LabelChip'
import { ManageList } from './ManageList'
import { MultiSelect } from './MultiSelect'

type Props = {
  filters: Filters
  onChange: (filters: Filters) => void
  members: Member[]
  labels: Label[]
  tasks: Task[]
  visibleCount: number
}

const toggleIn = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

export function Toolbar({ filters, onChange, members, labels, tasks, visibleCount }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const active = hasActiveFilters(filters)

  const createMember = useCreateMember()
  const deleteMember = useDeleteMember()
  const createLabel = useCreateLabel()
  const deleteLabel = useDeleteLabel()

  // "/" focuses search, as in Linear and GitHub.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const el = e.target as HTMLElement
      if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const memberName = (id: string) => (id === UNASSIGNED ? 'Unassigned' : members.find((m) => m.id === id)?.name)
  const labelName = (id: string) => labels.find((l) => l.id === id)?.name

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          ref={searchRef}
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          onKeyDown={(e) => e.key === 'Escape' && (set({ query: '' }), e.currentTarget.blur())}
          placeholder="Search tasks"
          aria-label="Search tasks by title"
          className="h-8 w-full rounded-md border border-zinc-200 bg-white pr-8 pl-8 text-[13px] text-zinc-800 shadow-card transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none"
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => set({ query: '' })}
            className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-zinc-200 px-1 font-sans text-[10px] text-zinc-400 sm:block">
            /
          </kbd>
        )}
      </div>

      <MultiSelect
        trigger={
          <FilterButton label="Priority" values={filters.priorities.map((p) => PRIORITY_LABELS[p])} />
        }
        items={[...PRIORITIES].reverse().map((p) => ({ id: p, name: PRIORITY_LABELS[p], icon: <PriorityIcon priority={p} /> }))}
        selected={filters.priorities}
        onToggle={(id) => set({ priorities: toggleIn(filters.priorities, id as Task['priority']) })}
        placeholder="Filter by priority…"
      />
      <MultiSelect
        trigger={<FilterButton label="Assignee" values={filters.assignees.map(memberName).filter(Boolean) as string[]} />}
        items={[
          { id: UNASSIGNED, name: 'Unassigned', icon: <span className="size-5 rounded-full border border-dashed border-zinc-300" /> },
          ...members.map((m) => ({ id: m.id, name: m.name, icon: <Avatar member={m} size="xs" /> })),
        ]}
        selected={filters.assignees}
        onToggle={(id) => set({ assignees: toggleIn(filters.assignees, id) })}
        placeholder="Filter by assignee…"
      />
      <MultiSelect
        trigger={<FilterButton label="Label" values={filters.labels.map(labelName).filter(Boolean) as string[]} />}
        items={labels.map((l) => ({ id: l.id, name: l.name, icon: <ColorDot color={l.color} /> }))}
        selected={filters.labels}
        onToggle={(id) => set({ labels: toggleIn(filters.labels, id) })}
        placeholder="Filter by label…"
        emptyText="No labels yet"
      />

      {active && (
        <>
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800"
          >
            <X className="size-3.5" />
            Clear
          </button>
          <span className="text-xs text-zinc-500 tabular-nums" aria-live="polite">
            {visibleCount} of {tasks.length} tasks
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <ManageList
          trigger={
            <ToolbarButton aria-label="Manage team">
              {members.length > 0 ? (
                <AvatarStack members={members} max={4} />
              ) : (
                <Users className="size-3.5 text-zinc-500" />
              )}
              <span>Team</span>
            </ToolbarButton>
          }
          title="Team"
          description="People you can assign to tasks."
          rows={members}
          usage={(m) => tasks.filter((t) => t.assignee_ids.includes(m.id)).length}
          renderIcon={(m) => <Avatar member={m} size="xs" />}
          onCreate={(name, color) => createMember.create(name, color)}
          onDelete={(m) => deleteMember.mutate(m)}
          placeholder="Add a teammate"
          emptyText="No teammates yet"
        />
        <ManageList
          trigger={
            <ToolbarButton aria-label="Manage labels">
              <Tag className="size-3.5 text-zinc-500" />
              <span>Labels</span>
            </ToolbarButton>
          }
          title="Labels"
          description="Tag tasks by type, area or anything else."
          rows={labels}
          usage={(l) => tasks.filter((t) => t.label_ids.includes(l.id)).length}
          renderIcon={(l) => <ColorDot color={l.color} className="mx-1 size-2.5" />}
          onCreate={(name, color) => createLabel.create(name, color)}
          onDelete={(l) => deleteLabel.mutate(l)}
          placeholder="New label, e.g. Bug"
          emptyText="No labels yet"
        />
      </div>
    </div>
  )
}

const ToolbarButton = forwardRef<HTMLButtonElement, ComponentProps<'button'> & { active?: boolean; children: ReactNode }>(
  function ToolbarButton({ active, className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium shadow-card transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none data-[state=open]:border-zinc-300 data-[state=open]:bg-zinc-50',
          active
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70'
            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  },
)

/** "Priority", "Priority: High", or "Priority: 2" depending on how many values are set. */
const FilterButton = forwardRef<HTMLButtonElement, ComponentProps<'button'> & { label: string; values: string[] }>(
  function FilterButton({ label, values, ...props }, ref) {
    return (
      <ToolbarButton ref={ref} active={values.length > 0} {...props}>
        <span className="flex max-w-40 min-w-0">
          {label}
          {values.length > 0 && (
            <span className="truncate font-normal">: {values.length === 1 ? values[0] : values.length}</span>
          )}
        </span>
        <ChevronDown className="size-3.5 opacity-60" />
      </ToolbarButton>
    )
  },
)
