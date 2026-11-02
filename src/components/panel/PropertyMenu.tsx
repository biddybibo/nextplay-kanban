import type { ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { clsx } from 'clsx'
import { Check } from 'lucide-react'

type Option<T extends string> = { value: T; label: string; icon?: ReactNode }

/** A property value that opens a single-select menu, Linear-style. */
export function PropertyMenu<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
}) {
  const current = options.find((o) => o.value === value)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={label}
        className="flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-zinc-800 transition-colors outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500/40 data-[state=open]:bg-zinc-100"
      >
        {current?.icon}
        {current?.label}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-[60] min-w-44 animate-fade-in rounded-lg bg-surface p-1 shadow-lifted ring-1 ring-zinc-950/5"
        >
          {options.map((o) => (
            <DropdownMenu.Item
              key={o.value}
              onSelect={() => o.value !== value && onChange(o.value)}
              className={clsx(
                'flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] text-zinc-700 outline-none select-none data-[highlighted]:bg-zinc-100',
              )}
            >
              {o.icon}
              {o.label}
              {o.value === value && <Check className="ml-auto size-3.5 text-indigo-600" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
