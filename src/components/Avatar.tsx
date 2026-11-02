import { clsx } from 'clsx'
import { initials } from '../lib/colors'
import type { Member } from '../lib/types'

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[11px]',
}

export function Avatar({
  member,
  size = 'sm',
  className,
}: {
  member: Pick<Member, 'name' | 'color'>
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold text-white select-none',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: member.color }}
      title={member.name}
      aria-label={member.name}
    >
      {initials(member.name)}
    </span>
  )
}

/** Overlapping avatars with a "+N" overflow bubble. */
export function AvatarStack({
  members,
  max = 3,
  size = 'xs',
}: {
  members: Member[]
  max?: number
  size?: keyof typeof SIZES
}) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length

  return (
    <span className="flex items-center -space-x-1">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} className="ring-2 ring-surface" />
      ))}
      {extra > 0 && (
        <span
          className={clsx(
            'inline-grid place-items-center rounded-full bg-zinc-100 font-semibold text-zinc-600 ring-2 ring-surface',
            SIZES[size],
          )}
          title={members.slice(max).map((m) => m.name).join(', ')}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
