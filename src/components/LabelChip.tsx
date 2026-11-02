import type { Label } from '../lib/types'

export function ColorDot({ color, className = 'size-2' }: { color: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: color }} />
}

/** Outlined pill with a color dot: readable for any label color, Linear-style. */
export function LabelChip({ label }: { label: Pick<Label, 'name' | 'color'> }) {
  return (
    <span className="inline-flex h-5 max-w-32 items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-600">
      <ColorDot color={label.color} className="size-1.5" />
      <span className="truncate">{label.name}</span>
    </span>
  )
}
