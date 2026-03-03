import { useState, useEffect, useCallback, useRef } from 'react'
import type { QueueItemDisplay, AutomationSource } from '../services/automationSources'
import { fetchSourceQueue } from '../services/automationSources'

export function useSourceQueue(
  sourceId: string | null,
  category: AutomationSource['category'] = 'youtube-playlist'
): {
  items: QueueItemDisplay[]
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const [items, setItems] = useState<QueueItemDisplay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceIdRef = useRef(sourceId)
  sourceIdRef.current = sourceId

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSourceQueue(id, category)
      // Only update if sourceId hasn't changed during fetch
      if (sourceIdRef.current === id) {
        setItems(data)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load queue'
      if (sourceIdRef.current === id) setError(msg)
      console.warn('[useSourceQueue]', err)
    } finally {
      if (sourceIdRef.current === id) setLoading(false)
    }
  }, [category])

  useEffect(() => {
    if (!sourceId) {
      setItems([])
      return
    }
    void load(sourceId)
  }, [sourceId, load])

  const refetch = useCallback(() => {
    if (sourceIdRef.current) {
      void load(sourceIdRef.current)
    }
  }, [load])

  return { items, loading, error, refetch }
}
