import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { EntityDot } from '../../components/explore/EntityDot'
import { NodeTooltip } from '../../components/explore/NodeTooltip'
import { useEntityLayout, type EntityPosition } from '../../hooks/useEntityLayout'
import { useAuth } from '../../hooks/useAuth'
import { fetchClusterEntities, fetchEntityEdges } from '../../services/exploreQueries'
import { getEntityColor } from '../../config/entityTypes'
import type { ClusterData, EntityNode, ExploreFilters } from '../../types/explore'
import type { EntityEdge } from '../../services/exploreQueries'
import type { TooltipData } from '../../components/explore/NodeTooltip'

interface NeighborhoodViewProps {
  cluster: ClusterData
  allClusters: ClusterData[]
  filters: ExploreFilters
  showEdges: boolean
  selectedEntityId: string | null
  onSelectEntity: (entity: EntityNode | null) => void
  onBack: () => void
  onEntitiesLoaded?: (entities: EntityNode[]) => void
  onEdgesLoaded?: (edges: EntityEdge[]) => void
}

const HUB_CONNECTION_THRESHOLD = 7
const MIN_ZOOM = 0.2
const MAX_ZOOM = 4.0

interface Camera { zoom: number; panX: number; panY: number }

export function NeighborhoodView({
  cluster,
  allClusters,
  filters,
  showEdges,
  selectedEntityId,
  onSelectEntity,
  onBack,
  onEntitiesLoaded,
  onEdgesLoaded,
}: NeighborhoodViewProps) {
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
  const [entities, setEntities] = useState<EntityNode[]>([])
  const [edges, setEdges] = useState<EntityEdge[]>([])
  const [loading, setLoading] = useState(true)

  // Draggable positions — live state so drag updates trigger re-render
  const layoutPositions = useEntityLayout(entities, edges, size.width, size.height)
  const [nodePositions, setNodePositions] = useState<Map<string, EntityPosition>>(new Map())
  useEffect(() => { setNodePositions(layoutPositions) }, [layoutPositions])

  // Drag & pan refs (no state to avoid re-renders on every frame)
  const dragNodeRef = useRef<{ id: string } | null>(null)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const hasDraggedRef = useRef(false)

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ data: TooltipData; x: number; y: number } | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hovered entity (for edge highlighting)
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null)

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

  // Fetch cluster entities and edges
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)

    async function load() {
      try {
        const entityData = await fetchClusterEntities(user!.id, cluster.anchor.id, allClusters)
        if (cancelled) return
        setEntities(entityData)
        onEntitiesLoaded?.(entityData)

        const nodeIds = entityData.map(e => e.id)
        const edgeData = await fetchEntityEdges(user!.id, nodeIds)
        if (cancelled) return
        setEdges(edgeData)
        onEdgesLoaded?.(edgeData)
      } catch (err) {
        console.warn('NeighborhoodView fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, cluster.anchor.id, allClusters, onEntitiesLoaded, onEdgesLoaded])

  // Peripheral entities (belong to other clusters)
  const peripheralIds = useMemo(() => {
    const set = new Set<string>()
    for (const e of entities) {
      if (e.clusters.length > 0 && !e.clusters.includes(cluster.anchor.id)) {
        set.add(e.id)
      }
    }
    return set
  }, [entities, cluster.anchor.id])

  // Edge map keyed by node id
  const edgesForNode = useMemo(() => {
    const map = new Map<string, EntityEdge[]>()
    for (const e of edges) {
      const a = map.get(e.sourceNodeId) ?? []
      a.push(e); map.set(e.sourceNodeId, a)
      const b = map.get(e.targetNodeId) ?? []
      b.push(e); map.set(e.targetNodeId, b)
    }
    return map
  }, [edges])

  // Entities connected to the selected node (for dimming non-connected)
  const connectedToSelected = useMemo(() => {
    if (!selectedEntityId) return null
    const set = new Set<string>([selectedEntityId])
    for (const edge of edgesForNode.get(selectedEntityId) ?? []) {
      set.add(edge.sourceNodeId)
      set.add(edge.targetNodeId)
    }
    return set
  }, [selectedEntityId, edgesForNode])

  // Filter visibility
  const isEntityVisible = useCallback((entity: EntityNode): boolean => {
    if (!filters.searchQuery && !filters.spotlightEntityType) return true
    if (filters.spotlightEntityType) return entity.entityType === filters.spotlightEntityType
    if (filters.searchQuery) return entity.label.toLowerCase().includes(filters.searchQuery.toLowerCase())
    return true
  }, [filters])

  // Boundary radius uses static layout (stays stable while dragging nodes)
  const boundaryRadius = useMemo(() => {
    if (layoutPositions.size === 0) return 0
    let maxDist = 0
    const cx = size.width / 2
    const cy = size.height / 2
    for (const [, pos] of layoutPositions) {
      const dx = pos.x - cx
      const dy = pos.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) + pos.radius
      if (dist > maxDist) maxDist = dist
    }
    return maxDist + 30
  }, [layoutPositions, size])

  // Visible edges
  const visibleEdges = useMemo(() => {
    if (showEdges) return edges
    const activeId = hoveredEntityId || selectedEntityId
    if (!activeId) return []
    return edgesForNode.get(activeId) ?? []
  }, [showEdges, hoveredEntityId, selectedEntityId, edges, edgesForNode])

  // ── Camera helpers ────────────────────────────────────────────────────────

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

  // Wheel zoom (non-passive to call preventDefault; ctrlKey = trackpad pinch)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      setCamera(prev => {
        const newZoom = e.ctrlKey
          ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * (1 - e.deltaY * 0.01)))
          : Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * (e.deltaY < 0 ? 1.1 : 0.9)))
        return {
          zoom: newZoom,
          panX: sx - (sx - prev.panX) / prev.zoom * newZoom,
          panY: sy - (sy - prev.panY) / prev.zoom * newZoom,
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [size.width, size.height])

  // Keyboard zoom: +/= to zoom in, -/_ to zoom out, 0 to reset
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

  // ── SVG interaction ───────────────────────────────────────────────────────

  const toWorldPos = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const cam = cameraRef.current
    return {
      wx: (clientX - rect.left - cam.panX) / cam.zoom,
      wy: (clientY - rect.top - cam.panY) / cam.zoom,
    }
  }

  const hitTestEntity = (wx: number, wy: number): EntityNode | null => {
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i]!
      const pos = nodePositions.get(entity.id)
      if (!pos) continue
      const dx = wx - pos.x
      const dy = wy - pos.y
      if (Math.sqrt(dx * dx + dy * dy) < pos.radius + 8) return entity
    }
    return null
  }

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    hasDraggedRef.current = false
    const { wx, wy } = toWorldPos(e.clientX, e.clientY)
    const hit = hitTestEntity(wx, wy)

    if (hit) {
      dragNodeRef.current = { id: hit.id }
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
      const id = dragNodeRef.current.id
      setNodePositions(prev => {
        const old = prev.get(id)
        if (!old) return prev
        const next = new Map(prev)
        next.set(id, { ...old, x: wx, y: wy })
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
      onSelectEntity(null)
    }
    hasDraggedRef.current = false
  }

  // ── Entity event handlers ─────────────────────────────────────────────────

  const handleEntityHover = useCallback((entity: EntityNode | null, event: React.MouseEvent) => {
    if (dragNodeRef.current) return  // suppress during drag
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
    if (entity) {
      tooltipTimerRef.current = setTimeout(() => {
        setTooltip({
          data: { kind: 'entity', data: entity },
          x: event.clientX,
          y: event.clientY,
        })
      }, 120)
      setHoveredEntityId(entity.id)
    } else {
      setTooltip(null)
      setHoveredEntityId(null)
    }
  }, [])

  const handleEntityClick = useCallback((entity: EntityNode) => {
    if (hasDraggedRef.current) return  // was a drag, not a click
    onSelectEntity(selectedEntityId === entity.id ? null : entity)
  }, [onSelectEntity, selectedEntityId])

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    }
  }, [])

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
          Loading entities…
        </span>
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
          {/* Camera transform — wraps all world-space content */}
          <g transform={`translate(${camera.panX},${camera.panY}) scale(${camera.zoom})`}>
            {/* 1. Cluster boundary ghost */}
            <circle
              cx={size.width / 2}
              cy={size.height / 2}
              r={boundaryRadius}
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth={1}
              strokeDasharray="8 6"
            />

            {/* 2. Entity edges */}
            {visibleEdges.map(edge => {
              const sourcePos = nodePositions.get(edge.sourceNodeId)
              const targetPos = nodePositions.get(edge.targetNodeId)
              if (!sourcePos || !targetPos) return null

              const isSelected =
                selectedEntityId === edge.sourceNodeId || selectedEntityId === edge.targetNodeId
              const isHovered =
                hoveredEntityId === edge.sourceNodeId || hoveredEntityId === edge.targetNodeId

              const dx = targetPos.x - sourcePos.x
              const dy = targetPos.y - sourcePos.y
              const mx = (sourcePos.x + targetPos.x) / 2
              const my = (sourcePos.y + targetPos.y) / 2
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const offset = Math.min(len * 0.15, 30)
              const ecx = mx - dy * offset / len
              const ecy = my + dx * offset / len

              return (
                <g key={`${edge.sourceNodeId}-${edge.targetNodeId}`}>
                  <path
                    d={`M ${sourcePos.x} ${sourcePos.y} Q ${ecx} ${ecy} ${targetPos.x} ${targetPos.y}`}
                    fill="none"
                    stroke={
                      isSelected
                        ? 'var(--color-accent-500)'
                        : isHovered
                          ? 'rgba(0,0,0,0.2)'
                          : 'rgba(0,0,0,0.15)'
                    }
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                  />
                  {isSelected && edge.relationType && (
                    <text
                      x={ecx}
                      y={ecy - 6}
                      textAnchor="middle"
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 8,
                        fontWeight: 500,
                        fill: 'var(--color-accent-600)',
                        pointerEvents: 'none',
                        textShadow: '0 0 3px var(--color-bg-content), 0 0 3px var(--color-bg-content)',
                      }}
                    >
                      {edge.relationType}
                    </text>
                  )}
                </g>
              )
            })}

            {/* 3. Entity nodes */}
            {entities.map(entity => {
              const pos = nodePositions.get(entity.id)
              if (!pos) return null

              const isHub = entity.connectionCount >= HUB_CONNECTION_THRESHOLD
              const isPeripheral = peripheralIds.has(entity.id)
              const filterVisible = isEntityVisible(entity)
              // Dim unconnected entities when a node is selected
              const isDimmed = !filterVisible || (connectedToSelected !== null && !connectedToSelected.has(entity.id))

              return (
                <EntityDot
                  key={entity.id}
                  entity={entity}
                  x={pos.x}
                  y={pos.y}
                  radius={pos.radius}
                  selected={selectedEntityId === entity.id}
                  dimmed={isDimmed}
                  isPeripheral={isPeripheral}
                  isHubLabel={isHub}
                  onHover={handleEntityHover}
                  onClick={handleEntityClick}
                />
              )
            })}
          </g>
        </svg>
      )}

      {/* Breadcrumb — top-left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 cursor-pointer font-body"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '5px 10px',
            transition: 'all 0.15s ease',
            pointerEvents: 'all',
          }}
        >
          <ArrowLeft size={12} />
          All clusters
        </button>
        <ChevronRight size={12} style={{ color: 'var(--color-text-placeholder)' }} />
        <span
          className="flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '5px 10px',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: getEntityColor(cluster.anchor.entityType),
              flexShrink: 0,
            }}
          />
          {cluster.anchor.label}
        </span>
      </div>

      {/* Entity count — top-right */}
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
          pointerEvents: 'none',
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
          {entities.length}
        </span>{' '}
        entities · {edges.length} edges
      </div>

      {/* Zoom controls — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
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
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: 'var(--color-text-secondary)',
              fontSize: 16,
              lineHeight: 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.95)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Hint — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          color: 'var(--color-text-placeholder)',
          pointerEvents: 'none',
        }}
      >
        Drag nodes · Scroll to zoom · Drag background to pan
      </div>

      {/* Tooltip */}
      {tooltip && (
        <NodeTooltip
          tooltip={tooltip.data}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  )
}
