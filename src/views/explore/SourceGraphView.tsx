import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Upload } from 'lucide-react'
import { SourceCard } from '../../components/explore/SourceCard'
import { getSourceConfig } from '../../config/sourceTypes'
import { useSourceLayout } from '../../hooks/useSourceLayout'
import type { SourcePosition } from '../../hooks/useSourceLayout'
import { useAuth } from '../../hooks/useAuth'
import { fetchSourceGraph } from '../../services/exploreQueries'
import type {
  SourceNode,
  SourceEdge,
  SourceGraphAnchor,
  SourceConnectionType,
  ExploreFilters,
} from '../../types/explore'

// ─── Connection-type color map ───────────────────────────────────────────────
const CONN_COLORS: Record<SourceConnectionType, string> = {
  entity: '#6366f1',  // indigo
  tag: '#10b981',     // emerald
  anchor: '#b45309',  // amber/anchor
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 4.0
const ANCHOR_RADIUS = 14

interface Camera { zoom: number; panX: number; panY: number }

interface SourceGraphViewProps {
  filters: ExploreFilters
  selectedSourceId: string | null
  onSelectSource: (source: SourceNode | null) => void
  onSourcesLoaded?: (sources: SourceNode[], edges: SourceEdge[], anchors: SourceGraphAnchor[]) => void
}

export function SourceGraphView({
  filters,
  selectedSourceId,
  onSelectSource,
  onSourcesLoaded,
}: SourceGraphViewProps) {
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const sizeRef = useRef({ width: 0, height: 0 })

  // Camera (zoom + pan)
  const [camera, setCamera] = useState<Camera>({ zoom: 1, panX: 0, panY: 0 })
  const cameraRef = useRef<Camera>({ zoom: 1, panX: 0, panY: 0 })
  useEffect(() => { cameraRef.current = camera }, [camera])

  // Data state
  const [sources, setSources] = useState<SourceNode[]>([])
  const [edges, setEdges] = useState<SourceEdge[]>([])
  const [anchors, setAnchors] = useState<SourceGraphAnchor[]>([])
  const [loading, setLoading] = useState(true)

  // Interaction state
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null)

  // Mutable positions layer (drag updates applied here)
  const layoutPositions = useSourceLayout(sources, edges, size.width, size.height, anchors)
  const [nodePositions, setNodePositions] = useState<Map<string, SourcePosition>>(new Map())
  useEffect(() => { setNodePositions(layoutPositions) }, [layoutPositions])

  // Drag & pan refs (no state to avoid re-renders every frame)
  const dragNodeRef = useRef<{ id: string; isAnchor: boolean } | null>(null)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const hasDraggedRef = useRef(false)

  // Edge/anchor refs for drag spring physics (never stale)
  const edgesRef = useRef(edges)
  useEffect(() => { edgesRef.current = edges }, [edges])
  const anchorsRef = useRef(anchors)
  useEffect(() => { anchorsRef.current = anchors }, [anchors])

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        const s = { width: entry.contentRect.width, height: entry.contentRect.height }
        setSize(s)
        sizeRef.current = s
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
        setAnchors(data.anchors)
        onSourcesLoaded?.(data.sources, data.edges, data.anchors)
      })
      .catch(err => console.warn('SourceGraphView fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user, onSourcesLoaded])

  // ─── Filtering logic (uses filters prop from useExploreFilters) ────────────

  const filteredEdges = useMemo(() => {
    if (filters.connTypes.size === 0) return edges
    return edges.filter(e =>
      e.connections.some(c => filters.connTypes.has(c.type))
    )
  }, [edges, filters.connTypes])

  const filteredSourceIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of sources) {
      if (filters.sourceTypes.size > 0 && !filters.sourceTypes.has(s.sourceType)) continue
      if (filters.sourceAnchorFilter && !s.anchorIds.includes(filters.sourceAnchorFilter)) continue
      if (filters.searchQuery && !s.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) continue
      if (filters.recency !== 'all') {
        const days = filters.recency === '7d' ? 7 : 30
        if (Date.now() - new Date(s.createdAt).getTime() > days * 86400000) continue
      }
      ids.add(s.id)
    }
    return ids
  }, [sources, filters.sourceTypes, filters.sourceAnchorFilter, filters.searchQuery, filters.recency])

  // Edge helpers
  const edgesForSource = useMemo(() => {
    const map = new Map<string, SourceEdge[]>()
    for (const e of filteredEdges) {
      const a = map.get(e.fromSourceId) ?? []
      a.push(e); map.set(e.fromSourceId, a)
      const b = map.get(e.toSourceId) ?? []
      b.push(e); map.set(e.toSourceId, b)
    }
    return map
  }, [filteredEdges])

  const activeSourceId = hoveredSourceId || selectedSourceId
  const highlightedEdges = useMemo(() => {
    if (!activeSourceId) return new Set<string>()
    const relevant = edgesForSource.get(activeSourceId) ?? []
    return new Set(relevant.map(e => `${e.fromSourceId}-${e.toSourceId}`))
  }, [activeSourceId, edgesForSource])

  // ─── Derived data ─────────────────────────────────────────────────────────

  const getEdgeColor = (edge: SourceEdge, active: boolean): string => {
    if (active) return 'var(--color-accent-500)'
    const sorted = [...edge.connections].sort((a, b) => b.count - a.count)
    const primary = sorted[0]
    if (!primary) return 'rgba(0,0,0,0.08)'
    return CONN_COLORS[primary.type]
  }

  // ─── Camera helpers ────────────────────────────────────────────────────────

  const zoomAround = useCallback((factor: number, cx: number, cy: number) => {
    setCamera(prev => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor))
      return {
        zoom: newZoom,
        panX: cx - (cx - prev.panX) / prev.zoom * newZoom,
        panY: cy - (cy - prev.panY) / prev.zoom * newZoom,
      }
    })
  }, [])

  const zoomIn = useCallback(() => {
    zoomAround(1.25, sizeRef.current.width / 2, sizeRef.current.height / 2)
  }, [zoomAround])

  const zoomOut = useCallback(() => {
    zoomAround(0.8, sizeRef.current.width / 2, sizeRef.current.height / 2)
  }, [zoomAround])

  const resetCamera = useCallback(() => {
    setCamera({ zoom: 1, panX: 0, panY: 0 })
  }, [])

  // Wheel zoom (non-passive to call preventDefault)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (e.ctrlKey) {
        // Trackpad pinch
        setCamera(prev => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * (1 - e.deltaY * 0.01)))
          return {
            zoom: newZoom,
            panX: sx - (sx - prev.panX) / prev.zoom * newZoom,
            panY: sy - (sy - prev.panY) / prev.zoom * newZoom,
          }
        })
      } else if (Math.abs(e.deltaX) > 2) {
        // Trackpad two-finger swipe → pan
        setCamera(prev => ({
          ...prev,
          panX: prev.panX - e.deltaX,
          panY: prev.panY - e.deltaY,
        }))
      } else {
        // Mouse scroll wheel → zoom around cursor
        setCamera(prev => {
          const factor = e.deltaY < 0 ? 1.12 : 0.9
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor))
          return {
            zoom: newZoom,
            panX: sx - (sx - prev.panX) / prev.zoom * newZoom,
            panY: sy - (sy - prev.panY) / prev.zoom * newZoom,
          }
        })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [size.width, size.height])

  // Keyboard zoom: +/= in, -/_ out, 0 reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '+' || e.key === '=') { zoomIn(); e.preventDefault() }
      else if (e.key === '-' || e.key === '_') { zoomOut(); e.preventDefault() }
      else if (e.key === '0') { resetCamera(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomIn, zoomOut, resetCamera])

  // ─── SVG interaction (drag + pan) ──────────────────────────────────────────

  const toWorldPos = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const cam = cameraRef.current
    return {
      wx: (clientX - rect.left - cam.panX) / cam.zoom,
      wy: (clientY - rect.top - cam.panY) / cam.zoom,
    }
  }

  const hitTestNode = (wx: number, wy: number): { id: string; isAnchor: boolean } | null => {
    // Test anchors first (smaller, drawn on top)
    for (const anchor of anchors) {
      const pos = nodePositions.get(anchor.id)
      if (!pos) continue
      const dx = wx - pos.x
      const dy = wy - pos.y
      if (Math.sqrt(dx * dx + dy * dy) < ANCHOR_RADIUS + 8) {
        return { id: anchor.id, isAnchor: true }
      }
    }
    // Test sources (reverse z-order)
    for (let i = sources.length - 1; i >= 0; i--) {
      const source = sources[i]!
      const pos = nodePositions.get(source.id)
      if (!pos) continue
      const dx = wx - pos.x
      const dy = wy - pos.y
      if (Math.sqrt(dx * dx + dy * dy) < pos.radius + 8) {
        return { id: source.id, isAnchor: false }
      }
    }
    return null
  }

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    hasDraggedRef.current = false
    const { wx, wy } = toWorldPos(e.clientX, e.clientY)
    const hit = hitTestNode(wx, wy)

    if (hit) {
      dragNodeRef.current = hit
      if (svgRef.current) svgRef.current.style.cursor = 'grabbing'
    } else {
      const cam = cameraRef.current
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: cam.panX, panY: cam.panY }
      if (svgRef.current) svgRef.current.style.cursor = 'grab'
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragNodeRef.current) {
      const { wx, wy } = toWorldPos(e.clientX, e.clientY)
      const { id, isAnchor: isDragAnchor } = dragNodeRef.current
      setNodePositions(prev => {
        const old = prev.get(id)
        if (!old) return prev
        const dx = wx - old.x
        const dy = wy - old.y
        const next = new Map(prev)
        next.set(id, { ...old, x: wx, y: wy })

        // Spring: pull connected nodes
        if (!isDragAnchor) {
          // Dragging a source → pull connected sources via edges
          for (const edge of edgesRef.current) {
            if (edge.fromSourceId !== id && edge.toSourceId !== id) continue
            const otherId = edge.fromSourceId === id ? edge.toSourceId : edge.fromSourceId
            const other = next.get(otherId)
            if (!other) continue
            const k = Math.min(edge.totalWeight * 0.01, 0.15)
            next.set(otherId, { ...other, x: other.x + dx * k, y: other.y + dy * k })
          }
          // Pull connected anchors
          for (const anchor of anchorsRef.current) {
            if (!anchor.connectedSourceIds.includes(id)) continue
            const anchorPos = next.get(anchor.id)
            if (!anchorPos) continue
            next.set(anchor.id, { ...anchorPos, x: anchorPos.x + dx * 0.08, y: anchorPos.y + dy * 0.08 })
          }
        } else {
          // Dragging an anchor → pull connected sources
          const anchor = anchorsRef.current.find(a => a.id === id)
          if (anchor) {
            for (const srcId of anchor.connectedSourceIds) {
              const srcPos = next.get(srcId)
              if (!srcPos) continue
              next.set(srcId, { ...srcPos, x: srcPos.x + dx * 0.08, y: srcPos.y + dy * 0.08 })
            }
          }
        }

        return next
      })
      hasDraggedRef.current = true
    } else if (panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDraggedRef.current = true
      const { panX: startPanX, panY: startPanY } = panStartRef.current
      setCamera(prev => ({ ...prev, panX: startPanX + dx, panY: startPanY + dy }))
    }
  }

  const handleSvgMouseUp = () => {
    dragNodeRef.current = null
    panStartRef.current = null
    if (svgRef.current) svgRef.current.style.cursor = 'default'
  }

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === e.currentTarget && !hasDraggedRef.current) {
      onSelectSource(null)
    }
    hasDraggedRef.current = false
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSourceHover = useCallback((source: SourceNode | null) => {
    if (dragNodeRef.current) return
    setHoveredSourceId(source?.id ?? null)
    if (source) {
      const pos = nodePositions.get(source.id)
      if (pos) {
        const cam = cameraRef.current
        setTooltipPos({
          x: pos.x * cam.zoom + cam.panX,
          y: pos.y * cam.zoom + cam.panY,
        })
      }
    } else {
      setTooltipPos(null)
    }
  }, [nodePositions])

  const handleSourceClick = useCallback((source: SourceNode) => {
    if (hasDraggedRef.current) return
    onSelectSource(selectedSourceId === source.id ? null : source)
  }, [onSelectSource, selectedSourceId])

  // Loading
  if (loading) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Loading sources…
        </span>
      </div>
    )
  }

  // Empty
  if (sources.length === 0) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" style={{ maxWidth: 320, textAlign: 'center' }}>
          <Upload size={32} style={{ color: 'var(--color-text-placeholder)' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            No sources yet
          </h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
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
          ref={svgRef}
          width={size.width}
          height={size.height}
          style={{ display: 'block' }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onClick={handleSvgClick}
        >
          {/* Camera transform wraps all world-space content */}
          <g transform={`translate(${camera.panX},${camera.panY}) scale(${camera.zoom})`}>

            {/* 1. Source-to-source edges — always color-coded by dominant connection type */}
            {filteredEdges.map(edge => {
              const fromPos = nodePositions.get(edge.fromSourceId)
              const toPos = nodePositions.get(edge.toSourceId)
              if (!fromPos || !toPos) return null

              const edgeKey = `${edge.fromSourceId}-${edge.toSourceId}`
              const isHighlighted = highlightedEdges.has(edgeKey)
              const isSelected = selectedSourceId === edge.fromSourceId || selectedSourceId === edge.toSourceId
              const isActive = isHighlighted || isSelected
              const hasActiveSource = !!activeSourceId
              const strokeWidth = Math.min(1 + edge.totalWeight * 0.3, 5)
              const dominantColor = getEdgeColor(edge, false)

              const mx = (fromPos.x + toPos.x) / 2
              const my = (fromPos.y + toPos.y) / 2

              return (
                <g key={edgeKey}>
                  <line
                    x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
                    stroke={isActive ? getEdgeColor(edge, isSelected) : dominantColor}
                    strokeWidth={isActive ? strokeWidth + 0.5 : Math.max(strokeWidth * 0.6, 0.8)}
                    strokeOpacity={isActive ? 0.85 : hasActiveSource ? 0.06 : 0.35}
                    style={{ transition: 'stroke 0.18s ease, stroke-opacity 0.18s ease, stroke-width 0.18s ease' }}
                  />
                  {/* Edge badge on highlight */}
                  {isActive && (
                    <g transform={`translate(${mx}, ${my})`}>
                      <rect x={-14} y={-10} width={28} height={20} rx={10} ry={10}
                        fill="var(--color-bg-card)" stroke="var(--border-subtle)" strokeWidth={1}
                      />
                      <text textAnchor="middle" dominantBaseline="central"
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700,
                          fill: isSelected ? 'var(--color-accent-500)' : 'var(--color-text-primary)',
                        }}
                      >
                        {edge.totalWeight}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* 2. Source-to-anchor edges (dashed, always visible) */}
            {anchors.map(anchor => {
              const anchorPos = nodePositions.get(anchor.id)
              if (!anchorPos) return null
              return anchor.connectedSourceIds.map(srcId => {
                const srcPos = nodePositions.get(srcId)
                if (!srcPos) return null
                const isAnchorActive = hoveredAnchorId === anchor.id || filters.sourceAnchorFilter === anchor.id
                const isSourceActive = activeSourceId === srcId
                const isActive = isAnchorActive || isSourceActive
                return (
                  <line
                    key={`a-${anchor.id}-${srcId}`}
                    x1={anchorPos.x} y1={anchorPos.y} x2={srcPos.x} y2={srcPos.y}
                    stroke="rgba(180,83,9,0.75)"
                    strokeWidth={isActive ? 1.8 : 0.8}
                    strokeOpacity={isActive ? 0.65 : (activeSourceId && !isSourceActive) ? 0.04 : 0.2}
                    strokeDasharray={isActive ? '6,3' : '4,4'}
                    style={{ transition: 'stroke-opacity 0.18s ease, stroke-width 0.18s ease' }}
                  />
                )
              })
            })}

            {/* 3. Source dots */}
            {sources.map(source => {
              const pos = nodePositions.get(source.id)
              if (!pos) return null
              return (
                <SourceCard
                  key={source.id}
                  source={source}
                  x={pos.x} y={pos.y}
                  selected={selectedSourceId === source.id}
                  dimmed={!filteredSourceIds.has(source.id)}
                  onHover={handleSourceHover}
                  onClick={handleSourceClick}
                />
              )
            })}

            {/* 4. Anchor nodes — parchment/gold style matching NeighborhoodView */}
            {anchors.map(anchor => {
              const pos = nodePositions.get(anchor.id)
              if (!pos) return null
              const isActive = hoveredAnchorId === anchor.id || filters.sourceAnchorFilter === anchor.id

              return (
                <g
                  key={`anchor-${anchor.id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => { if (!dragNodeRef.current) setHoveredAnchorId(anchor.id) }}
                  onMouseLeave={() => setHoveredAnchorId(null)}
                >
                  {/* Glow aura */}
                  <circle r={isActive ? 30 : 24} fill={isActive ? 'rgba(180,83,9,0.08)' : 'rgba(180,83,9,0.04)'} style={{ transition: 'r 0.15s ease' }} />
                  <circle r={isActive ? 22 : 18} fill={isActive ? 'rgba(180,83,9,0.12)' : 'rgba(180,83,9,0.06)'} style={{ transition: 'r 0.15s ease' }} />
                  {/* Gold border ring */}
                  <circle
                    r={14}
                    fill="none"
                    stroke={isActive ? 'rgba(180,83,9,0.85)' : 'rgba(180,83,9,0.55)'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                  />
                  {/* Parchment fill */}
                  <circle r={12.5} fill="rgb(235,222,205)" />
                  {/* Diamond symbol */}
                  <text
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 10, fill: 'rgba(140,70,0,0.85)', pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ◆
                  </text>
                  {/* Anchor label below */}
                  <text
                    y={24}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 8,
                      fontWeight: 700,
                      fill: isActive ? 'rgba(140,70,0,0.9)' : 'rgba(140,70,0,0.65)',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      transition: 'fill 0.15s ease',
                    }}
                  >
                    {anchor.label.length > 18 ? anchor.label.slice(0, 17) + '…' : anchor.label}
                  </text>
                  {/* Source count badge */}
                  <text
                    y={34}
                    textAnchor="middle"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 7,
                      fontWeight: 500,
                      fill: 'rgba(140,70,0,0.5)',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {anchor.connectedSourceIds.length} sources
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {/* Hover tooltip (screen coords — adjusted for camera) */}
      {hoveredSourceId && tooltipPos && (() => {
        const src = sources.find(s => s.id === hoveredSourceId)
        if (!src) return null
        const cfg = getSourceConfig(src.sourceType)
        const connCount = edgesForSource.get(src.id)?.length ?? 0
        return (
          <div
            style={{
              position: 'absolute', left: tooltipPos.x, top: tooltipPos.y - 44,
              transform: 'translateX(-50%)',
              background: 'var(--color-bg-card)', border: '1px solid var(--border-strong)',
              borderRadius: 8, padding: '6px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
              color: 'var(--color-text-primary)', maxWidth: 200,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {src.title}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--color-text-secondary)' }}>
              {src.entityCount} entities · {connCount} conn.
            </span>
          </div>
        )
      })()}

      {/* Stats overlay — top-right */}
      <div
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'var(--color-bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '8px 12px',
          fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-secondary)',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>
          {sources.length}
        </span>{' '}
        sources · {filteredEdges.length} connections · {anchors.length} anchors
      </div>

      {/* Connection type legend — top-right, below stats */}
      <div
        style={{
          position: 'absolute', top: 52, right: 16,
          display: 'flex', gap: 4, zIndex: 20,
        }}
      >
        {[
          { color: CONN_COLORS.entity, label: 'Entity', dash: false },
          { color: CONN_COLORS.tag, label: 'Tag', dash: false },
          { color: CONN_COLORS.anchor, label: 'Anchor', dash: true },
        ].map(({ color, label, dash }) => (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 20,
              border: `1.5px solid ${color}`,
              background: `${color}18`,
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
              color, whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >
            {dash ? (
              <svg width={10} height={3} style={{ flexShrink: 0 }}>
                <line x1={0} y1={1.5} x2={10} y2={1.5} stroke={color} strokeWidth={2} strokeDasharray="3,2" />
              </svg>
            ) : (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            )}
            {label}
          </div>
        ))}
      </div>

      {/* Zoom controls — bottom-right */}
      <div
        style={{
          position: 'absolute', bottom: 16, right: 16,
          display: 'flex', flexDirection: 'column', gap: 4,
          zIndex: 20,
        }}
      >
        {[
          { label: '+', title: 'Zoom in (+ key)', action: zoomIn },
          { label: '−', title: 'Zoom out (− key)', action: zoomOut },
          { label: '⊙', title: 'Reset view (0 key)', action: resetCamera },
        ].map(({ label, title, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            title={title}
            className="flex items-center justify-center font-body font-bold cursor-pointer"
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: 'var(--color-text-secondary)',
              fontSize: 16, lineHeight: 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.95)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* No edges banner */}
      {edges.length === 0 && sources.length > 0 && (
        <div
          style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 10, padding: '8px 16px',
            fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-secondary)',
            maxWidth: 400, textAlign: 'center',
          }}
        >
          Sources aren't connected yet. Ingest more content with overlapping topics to see connections emerge.
        </div>
      )}
    </div>
  )
}
