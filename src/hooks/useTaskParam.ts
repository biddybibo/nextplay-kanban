import { useCallback, useEffect, useState } from 'react'

const PARAM = 'task'

function read(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

/** The open task's id, mirrored in `?task=` so a reload reopens the panel. */
export function useTaskParam() {
  const [taskId, setTaskIdState] = useState<string | null>(read)

  useEffect(() => {
    const onPop = () => setTaskIdState(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setTaskId = useCallback((id: string | null) => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set(PARAM, id)
    else url.searchParams.delete(PARAM)
    window.history.replaceState(null, '', url)
    setTaskIdState(id)
  }, [])

  return [taskId, setTaskId] as const
}
