import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import type { QueueItem, QueueStatusFilter } from '../types/automate'
import {
  getQueueItems,
  retryQueueItem as retryQueueItemService,
  cancelQueueItem as cancelQueueItemService,
  reQueueItem as reQueueItemService,
  clearCompletedItems as clearCompletedService,
} from '../services/supabase'

export interface UseProcessingQueueReturn {
  items: QueueItem[]
  totalCount: number
  filter: QueueStatusFilter
  isLoading: boolean
  error: string | null
  setFilter: (filter: QueueStatusFilter) => void
  loadMore: () => Promise<void>
  retryItem: (itemId: string) => Promise<void>
  cancelItem: (itemId: string) => Promise<void>
  reQueueItem: (itemId: string) => Promise<void>
  clearCompleted: () => Promise<void>
  isPolling: boolean
  hasMore: boolean
}

const PAGE_SIZE = 20
const POLL_INTERVAL_MS = 10_000

export function useProcessingQueue(): UseProcessingQueueReturn {
  const { user } = useAuth()
  const [items, setItems] = useState<QueueItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [filter, setFilterState] = useState<QueueStatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasActiveItems = items.some(i =>
    i.status === 'fetching_transcript' || i.status === 'extracting'
  )

  const fetchItems = useCallback(
    async (offset: number, append: boolean) => {
      if (!user?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await getQueueItems(user.id, filter, { offset, limit: PAGE_SIZE })

        if (append) {
          setItems(prev => [...prev, ...result.items])
        } else {
          setItems(result.items)
        }
        setTotalCount(result.totalCount)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load queue'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id, filter]
  )

  // Fetch on mount + filter change
  useEffect(() => {
    fetchItems(0, false)
  }, [fetchItems])

  // Polling for active items
  useEffect(() => {
    if (hasActiveItems) {
      pollRef.current = setInterval(() => {
        fetchItems(0, false)
      }, POLL_INTERVAL_MS)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [hasActiveItems, fetchItems])

  const setFilter = useCallback((f: QueueStatusFilter) => {
    setFilterState(f)
  }, [])

  const loadMore = useCallback(async () => {
    await fetchItems(items.length, true)
  }, [fetchItems, items.length])

  const retryItem = useCallback(async (itemId: string) => {
    try {
      await retryQueueItemService(itemId)
      // Optimistic update
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'pending' as const, error_message: null, started_at: null, completed_at: null }
            : i
        )
      )
      // Background re-fetch
      setTimeout(() => fetchItems(0, false), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    }
  }, [fetchItems])

  const cancelItem = useCallback(async (itemId: string) => {
    try {
      await cancelQueueItemService(itemId)
      setItems(prev =>
        prev.map(i =>
          i.id === itemId ? { ...i, status: 'skipped' as const } : i
        )
      )
      setTimeout(() => fetchItems(0, false), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    }
  }, [fetchItems])

  const reQueueItemFn = useCallback(async (itemId: string) => {
    try {
      await reQueueItemService(itemId)
      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, status: 'pending' as const, error_message: null, started_at: null, completed_at: null }
            : i
        )
      )
      setTimeout(() => fetchItems(0, false), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-queue failed')
    }
  }, [fetchItems])

  const clearCompleted = useCallback(async () => {
    if (!user?.id) return
    try {
      await clearCompletedService(user.id)
      setItems(prev => prev.filter(i => i.status !== 'completed'))
      setTimeout(() => fetchItems(0, false), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed')
    }
  }, [user?.id, fetchItems])

  return {
    items,
    totalCount,
    filter,
    isLoading,
    error,
    setFilter,
    loadMore,
    retryItem,
    cancelItem,
    reQueueItem: reQueueItemFn,
    clearCompleted,
    isPolling: hasActiveItems,
    hasMore: items.length < totalCount,
  }
}
