import { useState, useEffect, useRef } from 'react'
import { getNodeNeighbors } from '../services/supabase'
import type { NodeNeighbor } from '../types/nodes'

interface UseNodeNeighborsReturn {
  neighbors: NodeNeighbor[]
  isLoading: boolean
  error: string | null
}

// Session-level cache per nodeId
const neighborsCache = new Map<string, NodeNeighbor[]>()

export function useNodeNeighbors(nodeId: string | null): UseNodeNeighborsReturn {
  const [neighbors, setNeighbors] = useState<NodeNeighbor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<boolean>(false)

  useEffect(() => {
    if (!nodeId) {
      setNeighbors([])
      setIsLoading(false)
      setError(null)
      return
    }

    const cached = neighborsCache.get(nodeId)
    if (cached) {
      setNeighbors(cached)
      setIsLoading(false)
      setError(null)
      return
    }

    abortRef.current = false
    setIsLoading(true)
    setError(null)

    getNodeNeighbors(nodeId, 20)
      .then(data => {
        if (!abortRef.current) {
          neighborsCache.set(nodeId, data)
          setNeighbors(data)
        }
      })
      .catch(err => {
        if (!abortRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load connections')
        }
      })
      .finally(() => {
        if (!abortRef.current) setIsLoading(false)
      })

    return () => {
      abortRef.current = true
    }
  }, [nodeId])

  return { neighbors, isLoading, error }
}
