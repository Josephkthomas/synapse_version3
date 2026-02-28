import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { fetchGraphData } from '../services/graphQueries'
import type { GraphData, GraphScope, GraphEdge } from '../types/graph'

function computeScopedData(full: GraphData, scope: GraphScope): GraphData {
  if (scope === 'overview') return full

  if (scope === 'anchors') {
    const anchorToSources: Record<string, Set<string>> = {}
    for (const edge of full.edges) {
      const existing = anchorToSources[edge.anchorId]
      if (!existing) {
        anchorToSources[edge.anchorId] = new Set([edge.sourceId])
      } else {
        existing.add(edge.sourceId)
      }
    }

    const anchorEdges: GraphEdge[] = []
    const anchorIds = full.anchors.map(a => a.id)
    for (let i = 0; i < anchorIds.length; i++) {
      for (let j = i + 1; j < anchorIds.length; j++) {
        const aId = anchorIds[i]
        const bId = anchorIds[j]
        if (!aId || !bId) continue
        const sourcesA = anchorToSources[aId] ?? new Set<string>()
        const sourcesB = anchorToSources[bId] ?? new Set<string>()
        const shared = [...sourcesA].filter(s => sourcesB.has(s))
        if (shared.length > 0) {
          anchorEdges.push({ sourceId: aId, anchorId: bId, weight: shared.length })
        }
      }
    }
    return {
      sources: [],
      anchors: full.anchors,
      edges: anchorEdges,
      stats: { sourceCount: 0, anchorCount: full.anchors.length, edgeCount: anchorEdges.length },
    }
  }

  // scope === 'sources'
  const sourceToAnchors: Record<string, Set<string>> = {}
  for (const edge of full.edges) {
    const existing = sourceToAnchors[edge.sourceId]
    if (!existing) {
      sourceToAnchors[edge.sourceId] = new Set([edge.anchorId])
    } else {
      existing.add(edge.anchorId)
    }
  }

  const sourceEdges: GraphEdge[] = []
  const sourceIds = full.sources.map(s => s.id)
  for (let i = 0; i < sourceIds.length; i++) {
    for (let j = i + 1; j < sourceIds.length; j++) {
      const aId = sourceIds[i]
      const bId = sourceIds[j]
      if (!aId || !bId) continue
      const anchorsA = sourceToAnchors[aId] ?? new Set<string>()
      const anchorsB = sourceToAnchors[bId] ?? new Set<string>()
      const shared = [...anchorsA].filter(anc => anchorsB.has(anc))
      if (shared.length > 0) {
        sourceEdges.push({ sourceId: aId, anchorId: bId, weight: shared.length })
      }
    }
  }
  return {
    sources: full.sources,
    anchors: [],
    edges: sourceEdges,
    stats: { sourceCount: full.sources.length, anchorCount: 0, edgeCount: sourceEdges.length },
  }
}

export function useGraphData(scope: GraphScope): {
  data: GraphData | null
  loading: boolean
  error: Error | null
  refetch: () => void
} {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<GraphData | null>(null)
  const fullDataRef = useRef<GraphData | null>(null)
  const fetchCount = useRef(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const id = ++fetchCount.current
    try {
      const full = await fetchGraphData(user.id)
      if (id !== fetchCount.current) return
      fullDataRef.current = full
      setData(computeScopedData(full, scope))
    } catch (err) {
      if (id !== fetchCount.current) return
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (id === fetchCount.current) setLoading(false)
    }
  }, [user, scope])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (fullDataRef.current) {
      setData(computeScopedData(fullDataRef.current, scope))
    }
  }, [scope])

  return { data, loading, error, refetch: load }
}
