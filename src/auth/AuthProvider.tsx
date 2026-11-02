import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthState } from './authContext'

// Shared across calls so StrictMode's double-mount (or a fast retry) can't
// create two anonymous users on first launch.
let pendingSignIn: Promise<User> | null = null

function ensureGuestUser(): Promise<User> {
  pendingSignIn ??= (async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (sessionData.session) return sessionData.session.user

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!data.user) throw new Error('Anonymous sign-in returned no user')
    return data.user
  })().finally(() => {
    pendingSignIn = null
  })
  return pendingSignIn
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const signIn = useCallback(() => {
    ensureGuestUser()
      .then((user) => setState({ status: 'ready', user }))
      .catch((error: unknown) =>
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
      )
  }, [])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    signIn()
  }, [signIn])

  useEffect(() => {
    signIn()

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Deferred: calling auth methods inside this callback can deadlock supabase-js.
        setTimeout(retry, 0)
      } else if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setState({ status: 'ready', user: session.user })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [signIn, retry])

  return <AuthContext.Provider value={{ ...state, retry }}>{children}</AuthContext.Provider>
}
