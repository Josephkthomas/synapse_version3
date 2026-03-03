import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from './useAuth'
import {
  fetchPipelineHistory,
  fetchActiveQueueItems,
  type PipelineSession,
} from '../services/supabase'
import type {
  PipelineHistoryItem,
  SourceTypeFilter,
  StatusFilter,
  SortOption,
} from '../types/pipeline'

const PAGE_SIZE = 20

function mapSessionToItem(s: PipelineSession): PipelineHistoryItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queueStatus = (s as any)._queueStatus as string | undefined
  const isFailed = !queueStatus && s.entity_count === 0 && s.extraction_duration_ms !== null
  const isProcessing = !!queueStatus

  let status: PipelineHistoryItem['status'] = 'completed'
  let step: string | undefined
  if (isProcessing) {
    status = queueStatus === 'pending' ? 'pending' : 'processing'
    step = queueStatus === 'pending' ? 'queued' : queueStatus
  } else if (isFailed) {
    status = 'failed'
  }

  return {
    id: s.id,
    title: s.source_name ?? 'Untitled',
    sourceType: (s.source_type ?? 'Document') as PipelineHistoryItem['sourceType'],
    mode: (s.extraction_mode ?? 'comprehensive') as PipelineHistoryItem['mode'],
    emphasis: (s.anchor_emphasis ?? 'standard') as PipelineHistoryItem['emphasis'],
    status,
    step,
    error: isFailed ? 'Extraction produced no entities' : undefined,
    createdAt: s.created_at,
    entityCount: s.entity_count,
    relationshipCount: s.relationship_count,
    chunkCount: 0, // Computed lazily in detail view
    duration: s.extraction_duration_ms ?? 0,
    confidence: 0, // Computed lazily from nodes
    crossConnections: 0, // Computed lazily from edges
    rating: s.feedback_rating,
    ratingText: s.feedback_text,
    entityBreakdown: {},
    topEntityTypes: [],
    anchors: (s.selected_anchor_ids ?? []),
    sourceId: null,
    sourceUrl: null,
    extractedNodeIds: s.extracted_node_ids ?? [],
    extractedEdgeIds: s.extracted_edge_ids ?? [],
  }
}

interface FilterCounts {
  all: number
  YouTube: number
  Meeting: number
  Document: number
  Note: number
  active: number
  completed: number
  failed: number
}

export interface UsePipelineHistoryReturn {
  items: PipelineHistoryItem[]
  allItems: PipelineHistoryItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
  counts: FilterCounts
}

export function usePipelineHistory(
  sourceFilter: SourceTypeFilter,
  statusFilter: StatusFilter,
  sortBy: SortOption
): UsePipelineHistoryReturn {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<PipelineSession[]>([])
  const [queueItems, setQueueItems] = useState<PipelineSession[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const fetchData = useCallback(
    async (offset: number, append: boolean) => {
      if (!user?.id || loadingRef.current) return
      loadingRef.current = true
      if (!append) setLoading(true)
      setError(null)

      try {
        const [historyResult, activeResult] = await Promise.all([
          fetchPipelineHistory(user.id, PAGE_SIZE, offset),
          offset === 0 ? fetchActiveQueueItems(user.id) : Promise.resolve(null),
        ])

        if (append) {
          setSessions(prev => [...prev, ...historyResult.sessions])
        } else {
          setSessions(historyResult.sessions)
        }
        setTotalCount(historyResult.totalCount)
        if (activeResult !== null) setQueueItems(activeResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline history')
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [user?.id]
  )

  useEffect(() => {
    fetchData(0, false)
  }, [fetchData])

  const loadMore = useCallback(() => {
    fetchData(sessions.length, true)
  }, [fetchData, sessions.length])

  const refetch = useCallback(() => {
    fetchData(0, false)
  }, [fetchData])

  // Merge sessions + queue items into unified list
  const allItems = useMemo(() => {
    const mapped = [
      ...queueItems.map(mapSessionToItem),
      ...sessions.map(mapSessionToItem),
    ]
    return mapped
  }, [sessions, queueItems])

  // Compute counts
  const counts = useMemo<FilterCounts>(() => {
    const c: FilterCounts = { all: allItems.length, YouTube: 0, Meeting: 0, Document: 0, Note: 0, active: 0, completed: 0, failed: 0 }
    for (const item of allItems) {
      if (item.sourceType === 'YouTube') c.YouTube += 1
      else if (item.sourceType === 'Meeting') c.Meeting += 1
      else if (item.sourceType === 'Document') c.Document += 1
      else if (item.sourceType === 'Note') c.Note += 1
      if (item.status === 'pending' || item.status === 'processing' || item.status === 'extracting') c.active += 1
      else if (item.status === 'completed') c.completed += 1
      else if (item.status === 'failed') c.failed += 1
    }
    return c
  }, [allItems])

  // Apply filters + sort
  const filteredItems = useMemo(() => {
    let result = allItems

    if (sourceFilter !== 'all') {
      result = result.filter(i => i.sourceType === sourceFilter)
    }

    if (statusFilter === 'active') {
      result = result.filter(i => i.status === 'pending' || i.status === 'processing' || i.status === 'extracting')
    } else if (statusFilter === 'completed') {
      result = result.filter(i => i.status === 'completed')
    } else if (statusFilter === 'failed') {
      result = result.filter(i => i.status === 'failed')
    }

    switch (sortBy) {
      case 'slowest':
        result = [...result].sort((a, b) => b.duration - a.duration)
        break
      case 'entities':
        result = [...result].sort((a, b) => b.entityCount - a.entityCount)
        break
      case 'confidence':
        result = [...result].sort((a, b) => a.confidence - b.confidence)
        break
      default: // 'recent' — already sorted by created_at desc
        break
    }

    return result
  }, [allItems, sourceFilter, statusFilter, sortBy])

  const hasMore = sessions.length < totalCount

  return {
    items: filteredItems,
    allItems,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    counts,
  }
}
