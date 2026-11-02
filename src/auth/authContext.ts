import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; error: Error }

type AuthContextValue = AuthState & { retry: () => void }

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** For components that only render once the guest session exists. */
export function useUser(): User {
  const auth = useAuth()
  if (auth.status !== 'ready') throw new Error('useUser called before the guest session was ready')
  return auth.user
}
