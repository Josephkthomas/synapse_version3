import { useState, useRef, useEffect, useCallback } from 'react'
import { ClusterBubble } from '../../components/explore/ClusterBubble'
import { NodeTooltip } from '../../components/explore/NodeTooltip'
import { getEntityColor } from '../../config/entityTypes'
import { useClusterLayout } from '../../hooks/useClusterLayout'
import type { ClusterData } from '../../types/explore'
import type { TooltipData } from '../../components/explore/NodeTooltip'
import type { GraphStats, UnclusteredEntity } from '../../services/exploreQueries'

interface LandscapeViewProps {
  clusters: ClusterData[]
  stats: GraphStats
  unclustered: UnclusteredEntity[]
  isClusterVisible: (cluster: ClusterData) => boolean
  onClusterClick: (cluster: ClusterData) => void
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 4.0

interface Camera { zoom: number; panX: number; panY: number }

export function LandscapeView({
  clusters,
  stats,
  unclustered,
  isClusterVisible,
  onClusterClick,
}: LandscapeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const sizeRef = useRef({ width: 0, height: 0 })

  // Camera (zoom + pan)
  const [camera, setCamera] = useState<Camera>({ zoom: 1, panX: 0, panY: 0 })
  const cameraRef = useRef<Camera>({ zoom: 1, panX: 0, panY: 0 })
  useEffect(() => { cameraRef.current = camera }, [camera])

  // Pan drag ref
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  // ResizeObserver for container dimensions
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

  // Compute cluster layout positions
  const layoutClusters = useClusterLayout(clusters, size.width, size.height)

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ data: TooltipData; x: number; y: number } | null>(null)

  const handleClusterHover = useCallback((cluster: ClusterData | null, event: React.MouseEvent) => {
    if (cluster) {
      setTooltip({
        data: { kind: 'cluster', data: cluster },
        x: event.clientX,
        y: event.clientY,
      })
    } else {
      setTooltip(null)
    }
  }, [])

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

  // Wheel zoom (non-passive; ctrlKey = trackpad pinch)
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

  // Keyboard zoom: +/= zoom in, -/_ zoom out, 0 reset
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

  // Pan on SVG background drag
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only pan when clicking the SVG background (not a cluster bubble)
    if (e.target !== e.currentTarget) return
    const cam = cameraRef.current
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: cam.panX, panY: cam.panY }
    if (svgRef.current) svgRef.current.style.cursor = 'grab'
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!panStartRef.current) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    const { panX: startPanX, panY: startPanY } = panStartRef.current
    setCamera(prev => ({ ...prev, panX: startPanX + dx, panY: startPanY + dy }))
  }

  const handleSvgMouseUp = () => {
    panStartRef.current = null
    if (svgRef.current) svgRef.current.style.cursor = 'default'
  }

  // Unclustered zone positioning
  const unclusteredX = size.width - 120
  const unclusteredY = size.height - 80

  // Check if any filter is active (affects cross-cluster edge dimming)
  const hasActiveFilter = clusters.some(c => !isClusterVisible(c))

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ overflow: 'hidden' }}
    >
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
        >
          {/* Camera transform — wraps all world-space content */}
          <g transform={`translate(${camera.panX},${camera.panY}) scale(${camera.zoom})`}>
            {/* 1. Cross-cluster edges */}
            {layoutClusters.map(cluster =>
              cluster.crossClusterEdges.map(edge => {
                const target = layoutClusters.find(c => c.anchor.id === edge.targetClusterId)
                if (!target) return null
                if (cluster.anchor.id > edge.targetClusterId) return null

                const bothVisible = isClusterVisible(cluster) && isClusterVisible(target)
                const opacity = hasActiveFilter && !bothVisible ? 0.02 : 0.06

                return (
                  <line
                    key={`${cluster.anchor.id}-${edge.targetClusterId}`}
                    x1={cluster.position.cx}
                    y1={cluster.position.cy}
                    x2={target.position.cx}
                    y2={target.position.cy}
                    stroke={`rgba(0,0,0,${opacity})`}
                    strokeWidth={Math.min(edge.totalWeight * 1.5, 6)}
                    strokeDasharray="6 4"
                    style={{ transition: 'opacity 0.18s ease' }}
                  />
                )
              })
            )}

            {/* 2. Cluster bubbles */}
            {layoutClusters.map(cluster => (
              <ClusterBubble
                key={cluster.anchor.id}
                cluster={cluster}
                dimmed={!isClusterVisible(cluster)}
                onHover={handleClusterHover}
                onClick={onClusterClick}
              />
            ))}

            {/* 3. Unclustered zone */}
            {unclustered.length > 0 && (
              <g>
                <text
                  x={unclusteredX}
                  y={unclusteredY - 30}
                  textAnchor="middle"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 10,
                    fontWeight: 700,
                    fill: 'var(--color-text-secondary)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  UNCLUSTERED
                </text>

                {unclustered.slice(0, 20).map((entity, i) => {
                  const angle = (i / Math.min(unclustered.length, 20)) * Math.PI * 2
                  const spreadR = 15 + Math.random() * 25
                  const dotX = unclusteredX + Math.cos(angle) * spreadR
                  const dotY = unclusteredY + Math.sin(angle) * spreadR

                  return (
                    <circle
                      key={entity.id}
                      cx={dotX}
                      cy={dotY}
                      r={3}
                      fill={getEntityColor(entity.entityType)}
                      opacity={0.5}
                    />
                  )
                })}
              </g>
            )}
          </g>
        </svg>
      )}

      {/* 4. Stats overlay — top-right */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <StatRow label="Clusters" value={stats.anchorCount} />
        <StatRow label="Entities" value={stats.nodeCount} />
        <StatRow label="Edges" value={stats.edgeCount} />
      </div>

      {/* 5. Level indicator — top-left */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'var(--color-accent-50)',
          border: '1px solid rgba(214,58,0,0.15)',
          borderRadius: 12,
          padding: '5px 12px',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-accent-500)',
          }}
        >
          Clusters
        </span>
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

      {/* Tooltip portal */}
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

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          color: 'var(--color-text-secondary)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        {value.toLocaleString()}
      </span>
    </div>
  )
}
