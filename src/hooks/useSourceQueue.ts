import { useState, useEffect, useCallback } from 'react'
import type { QueueItemDisplay, AutomationSource } from '../services/automationSources'
import { fetchSourceQueue } from '../services/automationSources'

export function useSourceQueue(
  sourceId: string | null,
  category: AutomationSource['category'] = 'youtube-channel'
): {
  items: QueueItemDisplay[]
  loading: boolean
  error: string | null
} {
  const [items, setItems] = useState<QueueItemDisplay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSourceQueue(id, category)
      setItems(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load queue'
      setError(msg)
      console.warn('[useSourceQueue]', err)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    if (!sourceId) {
      setItems([])
      return
    }
    void load(sourceId)
  }, [sourceId, load])

  return { items, loading, error }
}
