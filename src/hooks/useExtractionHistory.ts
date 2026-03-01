import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import type { ExtractionSession } from '../types/extraction'
import { getExtractionHistory } from '../services/supabase'

interface HistoryFilters {
  sourceType: string
  status: 'all' | 'completed' | 'failed'
  sortAsc: boolean
}

export interface UseExtractionHistoryReturn {
  sessions: ExtractionSession[]
  totalCount: number
  isLoading: boolean
  filters: HistoryFilters
  hasMore: boolean
  setSourceTypeFilter: (type: string) => void
  setStatusFilter: (status: 'all' | 'completed' | 'failed') => void
  toggleSort: () => void
  loadMore: () => void
  refetch: () => void
}

const PAGE_SIZE = 20

export function useExtractionHistory(): UseExtractionHistoryReturn {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ExtractionSession[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<HistoryFilters>({
    sourceType: 'all',
    status: 'all',
    sortAsc: false,
  })

  const fetchData = useCallback(
    async (offset: number, append: boolean) => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const result = await getExtractionHistory(
          user.id,
          {
            sourceType: filters.sourceType === 'all' ? undefined : filters.sourceType,
            status: filters.status === 'all' ? undefined : filters.status,
          },
          { offset, limit: PAGE_SIZE }
        )

        if (append) {
          setSessions(prev => [...prev, ...result.sessions])
        } else {
          setSessions(result.sessions)
        }
        setTotalCount(result.totalCount)
      } catch (err) {
        console.warn('[useExtractionHistory] Fetch failed:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, filters.sourceType, filters.status]
  )

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchData(0, false)
  }, [fetchData])

  const setSourceTypeFilter = useCallback((type: string) => {
    setFilters(prev => ({ ...prev, sourceType: type }))
  }, [])

  const setStatusFilter = useCallback((status: 'all' | 'completed' | 'failed') => {
    setFilters(prev => ({ ...prev, status }))
  }, [])

  const toggleSort = useCallback(() => {
    setFilters(prev => ({ ...prev, sortAsc: !prev.sortAsc }))
  }, [])

  const loadMore = useCallback(() => {
    fetchData(sessions.length, true)
  }, [fetchData, sessions.length])

  const refetch = useCallback(() => {
    fetchData(0, false)
  }, [fetchData])

  const hasMore = sessions.length < totalCount

  return {
    sessions,
    totalCount,
    isLoading,
    filters,
    hasMore,
    setSourceTypeFilter,
    setStatusFilter,
    toggleSort,
    loadMore,
    refetch,
  }
}
