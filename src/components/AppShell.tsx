import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { useTheme } from '../lib/theme'

export function ThemedToaster() {
  const { resolved } = useTheme()
  return <Toaster theme={resolved} position="bottom-right" toastOptions={{ className: 'font-sans text-[13px]' }} />
}

/** Last-resort catch for render errors, so a bug shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-sm font-semibold text-zinc-900">Something went wrong</p>
        <p className="mt-1 max-w-sm text-[13px] text-zinc-500">
          Your tasks are safe, they're saved in the cloud. Reloading usually fixes this.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 h-8 rounded-md bg-indigo-600 px-3 text-[13px] font-medium text-white hover:bg-indigo-500"
        >
          Reload
        </button>
      </div>
    )
  }
}
