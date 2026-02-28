import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchNodes } from '../services/supabase'
import type { NodeFilters, NodeWithMeta } from '../types/nodes'

interface UseNodesOptions {
  filters: NodeFilters
  pageSize?: number
}

interface UseNodesReturn {
  nodes: NodeWithMeta[]
  totalCount: number
  isLoading: boolean
  error: string | null
  page: number
  setPage: (page: number) => void
  refetch: () => void
  maxConnections: number
}

export function useNodes({ filters, pageSize = 50 }: UseNodesOptions): UseNodesReturn {
  const [nodes, setNodes] = useState<NodeWithMeta[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPageState] = useState(0)
  const [maxConnections, setMaxConnections] = useState(1)

  // Serialize filters for dependency comparison
  const filtersKey = JSON.stringify(filters)
  const filtersKeyRef = useRef(filtersKey)

  const load = useCallback(async (currentPage: number, currentFilters: NodeFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchNodes(currentFilters, { page: currentPage, pageSize })
      setNodes(result.data)
      setTotalCount(result.totalCount)
      const max = result.data.reduce((m, n) => Math.max(m, n.connectionCount), 1)
      setMaxConnections(max)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  // Reset to page 0 when filters change
  useEffect(() => {
    if (filtersKeyRef.current !== filtersKey) {
      filtersKeyRef.current = filtersKey
      setPageState(0)
      load(0, filters)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  // Initial load
  useEffect(() => {
    load(page, filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage)
    load(newPage, filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, load])

  const refetch = useCallback(() => {
    load(page, filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtersKey, load])

  return { nodes, totalCount, isLoading, error, page, setPage, refetch, maxConnections }
}
