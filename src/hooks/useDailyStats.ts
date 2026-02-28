import { useEffect, useState } from 'react'
import { fetchDailyStats } from '../services/feedQueries'
import type { DailyStats } from '../types/feed'

export function useDailyStats(): {
  stats: DailyStats | null
  loading: boolean
  error: Error | null
} {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchDailyStats()
      .then(data => {
        setStats(data)
        setError(null)
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error('Failed to load stats'))
        setStats(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading, error }
}
