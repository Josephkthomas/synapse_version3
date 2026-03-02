import { useState, useEffect, useCallback } from 'react'
import type { AutomationSource, QueueSummary } from '../services/automationSources'
import { fetchAutomationSources, fetchQueueSummary } from '../services/automationSources'

export function useAutomationSources(): {
  sources: AutomationSource[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  queueSummary: QueueSummary
} {
  const [sources, setSources] = useState<AutomationSource[]>([])
  const [queueSummary, setQueueSummary] = useState<QueueSummary>({ pending: 0, processing: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sourcesData, summaryData] = await Promise.all([
        fetchAutomationSources(),
        fetchQueueSummary(),
      ])
      setSources(sourcesData)
      setQueueSummary(summaryData)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load automation sources'
      setError(msg)
      console.warn('[useAutomationSources]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { sources, loading, error, refetch, queueSummary }
}
