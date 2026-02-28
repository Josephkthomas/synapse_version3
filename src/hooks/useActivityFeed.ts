import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchActivityFeed } from '../services/feedQueries'
import type { FeedItem } from '../types/feed'

const LIMIT = 20

export function useActivityFeed(): {
  items: FeedItem[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
} {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)
  const loadingMoreRef = useRef(false)

  const load = useCallback(async (offset: number, append: boolean) => {
    if (loadingMoreRef.current && append) return
    loadingMoreRef.current = true

    try {
      if (!append) setLoading(true)
      const { items: newItems, hasMore: more } = await fetchActivityFeed(LIMIT, offset)
      setItems(prev => append ? [...prev, ...newItems] : newItems)
      setHasMore(more)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load activity feed'))
    } finally {
      setLoading(false)
      loadingMoreRef.current = false
    }
  }, [])

  useEffect(() => {
    offsetRef.current = 0
    load(0, false)
  }, [load])

  const loadMore = useCallback(() => {
    const nextOffset = offsetRef.current + LIMIT
    offsetRef.current = nextOffset
    load(nextOffset, true)
  }, [load])

  const refetch = useCallback(() => {
    offsetRef.current = 0
    setItems([])
    load(0, false)
  }, [load])

  return { items, loading, error, hasMore, loadMore, refetch }
}
