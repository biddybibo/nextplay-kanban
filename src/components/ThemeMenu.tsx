import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePref } from '../lib/theme'

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

export function ThemeMenu() {
  const { pref, resolved, setPref } = useTheme()
  const TriggerIcon = resolved === 'dark' ? Moon : Sun

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Theme"
        title="Theme"
        className="grid size-8 place-items-center rounded-md text-zinc-500 transition-colors outline-none hover:bg-zinc-200/60 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-500/40 data-[state=open]:bg-zinc-200/60"
      >
        <TriggerIcon className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[60] min-w-36 animate-fade-in rounded-lg bg-surface p-1 shadow-lifted ring-1 ring-zinc-950/5"
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={() => setPref(value)}
              className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] text-zinc-700 outline-none select-none data-[highlighted]:bg-zinc-100"
            >
              <Icon className="size-3.5 text-zinc-500" />
              {label}
              {pref === value && <Check className="ml-auto size-3.5 text-indigo-600" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
