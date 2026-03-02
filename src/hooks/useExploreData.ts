import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { fetchClusterData, fetchGraphStats, fetchUnclusteredNodes } from '../services/exploreQueries'
import type { ClusterData } from '../types/explore'
import type { GraphStats, UnclusteredEntity } from '../services/exploreQueries'

export interface ExploreData {
  clusters: ClusterData[]
  stats: GraphStats
  unclustered: UnclusteredEntity[]
}

export function useExploreData(): {
  data: ExploreData | null
  loading: boolean
  error: Error | null
  refetch: () => void
} {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<ExploreData | null>(null)
  const fetchCount = useRef(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const id = ++fetchCount.current
    try {
      const [clusterResult, stats] = await Promise.all([
        fetchClusterData(user.id),
        fetchGraphStats(user.id),
      ])
      if (id !== fetchCount.current) return

      const unclustered = await fetchUnclusteredNodes(user.id, clusterResult.clusteredNodeIds)
      if (id !== fetchCount.current) return

      setData({ clusters: clusterResult.clusters, stats, unclustered })
    } catch (err) {
      if (id !== fetchCount.current) return
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (id === fetchCount.current) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}
