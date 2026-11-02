import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

let pref = readPref()

function resolve(p: ThemePref): ResolvedTheme {
  return p === 'system' ? (media.matches ? 'dark' : 'light') : p
}

function apply() {
  const resolved = resolve(pref)
  document.documentElement.dataset.theme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#121214' : '#fafafa')
  listeners.forEach((l) => l())
}

media.addEventListener('change', () => pref === 'system' && apply())

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit.
  }
  apply()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Current preference plus what it resolves to; re-renders when either changes. */
export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => pref)
  const resolved = useSyncExternalStore(subscribe, () => resolve(pref))
  return { pref: current, resolved, setPref: setThemePref }
}
