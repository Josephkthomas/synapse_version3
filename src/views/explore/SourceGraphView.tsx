import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Upload } from 'lucide-react'
import { SourceCard } from '../../components/explore/SourceCard'
import { useSourceLayout } from '../../hooks/useSourceLayout'
import { useAuth } from '../../hooks/useAuth'
import { fetchSourceGraph } from '../../services/exploreQueries'
import type { SourceNode, SourceEdge, ExploreFilters } from '../../types/explore'

interface SourceGraphViewProps {
  filters: ExploreFilters
  selectedSourceId: string | null
  onSelectSource: (source: SourceNode | null) => void
  onSourcesLoaded?: (sources: SourceNode[], edges: SourceEdge[]) => void
}

export function SourceGraphView({
  filters,
  selectedSourceId,
  onSelectSource,
  onSourcesLoaded,
}: SourceGraphViewProps) {
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Data state
  const [sources, setSources] = useState<SourceNode[]>([])
  const [edges, setEdges] = useState<SourceEdge[]>([])
  const [loading, setLoading] = useState(true)

  // Hovered source (for edge highlighting)
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null)

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Fetch source graph data
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)

    fetchSourceGraph(user.id)
      .then(data => {
        if (cancelled) return
        setSources(data.sources)
        setEdges(data.edges)
        onSourcesLoaded?.(data.sources, data.edges)
      })
      .catch(err => console.warn('SourceGraphView fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user, onSourcesLoaded])

  // Layout
  const positions = useSourceLayout(sources, edges, size.width, size.height)

  // Filter sources by search and recency
  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      // Search filter
      if (filters.searchQuery) {
        if (!s.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
          return false
        }
      }
      // Recency filter
      if (filters.recency !== 'all') {
        const now = Date.now()
        const created = new Date(s.createdAt).getTime()
        const days = filters.recency === '7d' ? 7 : 30
        if (now - created > days * 24 * 60 * 60 * 1000) return false
      }
      return true
    })
  }, [sources, filters.searchQuery, filters.recency])

  const filteredSourceIds = useMemo(
    () => new Set(filteredSources.map(s => s.id)),
    [filteredSources]
  )

  // Determine source visibility (for dimming)
  const isSourceVisible = useCallback((source: SourceNode): boolean => {
    return filteredSourceIds.has(source.id)
  }, [filteredSourceIds])

  // Edge helpers for highlighting
  const edgesForSource = useMemo(() => {
    const map = new Map<string, SourceEdge[]>()
    for (const e of edges) {
      const existing1 = map.get(e.fromSourceId) ?? []
      existing1.push(e)
      map.set(e.fromSourceId, existing1)
      const existing2 = map.get(e.toSourceId) ?? []
      existing2.push(e)
      map.set(e.toSourceId, existing2)
    }
    return map
  }, [edges])

  // Which edges to show highlighted
  const activeSourceId = hoveredSourceId || selectedSourceId
  const highlightedEdges = useMemo(() => {
    if (!activeSourceId) return new Set<string>()
    const relevant = edgesForSource.get(activeSourceId) ?? []
    return new Set(relevant.map(e => `${e.fromSourceId}-${e.toSourceId}`))
  }, [activeSourceId, edgesForSource])

  const handleSourceHover = useCallback((source: SourceNode | null) => {
    setHoveredSourceId(source?.id ?? null)
  }, [])

  const handleSourceClick = useCallback((source: SourceNode) => {
    onSelectSource(selectedSourceId === source.id ? null : source)
  }, [onSelectSource, selectedSourceId])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectSource(null)
    }
  }, [onSelectSource])

  // Loading
  if (loading) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
          }}
        >
          Loading sources…
        </span>
      </div>
    )
  }

  // Empty state — no sources
  if (sources.length === 0) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" style={{ maxWidth: 320, textAlign: 'center' }}>
          <Upload size={32} style={{ color: 'var(--color-text-placeholder)' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            No sources yet
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Ingest content to see your source graph.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ overflow: 'hidden' }}>
      {size.width > 0 && size.height > 0 && (
        <svg
          width={size.width}
          height={size.height}
          style={{ display: 'block' }}
          onClick={handleCanvasClick}
        >
          {/* 1. Source edges */}
          {edges.map(edge => {
            const fromPos = positions.get(edge.fromSourceId)
            const toPos = positions.get(edge.toSourceId)
            if (!fromPos || !toPos) return null

            const edgeKey = `${edge.fromSourceId}-${edge.toSourceId}`
            const isHighlighted = highlightedEdges.has(edgeKey)
            const isSelected =
              selectedSourceId === edge.fromSourceId || selectedSourceId === edge.toSourceId

            // Edge width scales with shared entity count (1–5px)
            const strokeWidth = Math.min(1 + edge.sharedEntityCount * 0.8, 5)

            // Midpoint for badge
            const mx = (fromPos.x + toPos.x) / 2
            const my = (fromPos.y + toPos.y) / 2

            return (
              <g key={edgeKey}>
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={
                    isSelected
                      ? 'var(--color-accent-500)'
                      : isHighlighted
                        ? 'rgba(0,0,0,0.15)'
                        : 'rgba(0,0,0,0.03)'
                  }
                  strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
                  style={{ transition: 'stroke 0.15s ease' }}
                />
                {/* Shared entity count badge — shown when edge is highlighted */}
                {(isHighlighted || isSelected) && (
                  <g transform={`translate(${mx}, ${my})`}>
                    <rect
                      x={-14}
                      y={-10}
                      width={28}
                      height={20}
                      rx={10}
                      ry={10}
                      fill="var(--color-bg-card)"
                      stroke="var(--border-subtle)"
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 9,
                        fontWeight: 700,
                        fill: isSelected
                          ? 'var(--color-accent-500)'
                          : 'var(--color-text-primary)',
                      }}
                    >
                      {edge.sharedEntityCount}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* 2. Source cards */}
          {sources.map(source => {
            const pos = positions.get(source.id)
            if (!pos) return null

            return (
              <SourceCard
                key={source.id}
                source={source}
                x={pos.x}
                y={pos.y}
                selected={selectedSourceId === source.id}
                dimmed={!isSourceVisible(source)}
                onHover={handleSourceHover}
                onClick={handleSourceClick}
              />
            )
          })}
        </svg>
      )}

      {/* Stats overlay — top-right */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '8px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'var(--color-text-secondary)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--color-text-primary)',
          }}
        >
          {sources.length}
        </span>{' '}
        sources · {edges.length} connections
      </div>

      {/* No edges info banner */}
      {edges.length === 0 && sources.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '8px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          Sources aren't connected yet. Ingest more content with overlapping topics to see connections emerge.
        </div>
      )}

      {/* Level indicator — top-left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '5px 10px',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        Sources
      </div>
    </div>
  )
}
