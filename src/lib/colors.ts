// Mid-saturation colors that read on white as dots/avatars and tint well at
// low opacity for label chips. Must match the DB check: #rrggbb.
export const PALETTE = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#64748b', // slate
] as const

/** The first palette color nobody uses yet, so new items look distinct. */
export function nextColor(used: string[]): string {
  return PALETTE.find((c) => !used.includes(c)) ?? PALETTE[used.length % PALETTE.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
