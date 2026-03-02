import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, Compass, RefreshCw, GripVertical } from 'lucide-react'
import { ExploreToolbar } from './explore/ExploreToolbar'
import { LandscapeView } from './explore/LandscapeView'
import { NeighborhoodView } from './explore/NeighborhoodView'
import { SourceGraphView } from './explore/SourceGraphView'
import { ExploreMetadataPanel } from './explore/ExploreMetadataPanel'
import { useExploreData } from '../hooks/useExploreData'
import { useExploreFilters } from '../hooks/useExploreFilters'
import type { ClusterData, EntityNode, SourceNode, SourceEdge } from '../types/explore'
import type { EntityEdge } from '../services/exploreQueries'

// ─── Layout constants ────────────────────────────────────────────────────────
const DEFAULT_LEFT_PCT = 60
const MIN_LEFT_PCT = 30
const MAX_LEFT_PCT = 80

export function ExploreView() {
  const { data, loading, error, refetch } = useExploreData()
  const {
    viewMode,
    setViewMode,
    zoomLevel,
    activeClusterId,
    showEdges,
    setShowEdges,
    selectedEntityId,
    setSelectedEntityId,
    enterNeighborhood,
    returnToLandscape,
    filters,
    toggleAnchor,
    toggleSpotlight,
    setRecency,
    isClusterVisible,
  } = useExploreFilters()

  // Track neighborhood entities + edges for metadata panel
  const [neighborhoodEntities, setNeighborhoodEntities] = useState<EntityNode[]>([])
  const [neighborhoodEdges, setNeighborhoodEdges] = useState<EntityEdge[]>([])

  // Source graph data (managed by SourceGraphView, stored here for metadata panel)
  const [allSources, setAllSources] = useState<SourceNode[]>([])
  const [sourceEdges, setSourceEdges] = useState<SourceEdge[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  // Resizable two-column layout
  const [leftWidthPct, setLeftWidthPct] = useState(DEFAULT_LEFT_PCT)
  const [isDragging, setIsDragging] = useState(false)
  const [isHandleHovered, setIsHandleHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartPct = useRef(DEFAULT_LEFT_PCT)

  const clusters = data?.clusters ?? []
  const stats = data?.stats ?? { nodeCount: 0, edgeCount: 0, sourceCount: 0, anchorCount: 0 }
  const unclustered = data?.unclustered ?? []

  // Find the active cluster for neighborhood view
  const activeCluster = useMemo(() => {
    if (!activeClusterId) return null
    return clusters.find(c => c.anchor.id === activeClusterId) ?? null
  }, [activeClusterId, clusters])

  const isNeighborhood = zoomLevel === 'neighborhood' && activeCluster !== null

  // Clear selection on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEntityId(null)
        setSelectedSourceId(null)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setSelectedEntityId])

  // Drag-to-resize
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartPct.current = leftWidthPct
    setIsDragging(true)

    const onMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.offsetWidth
      const delta = ev.clientX - dragStartX.current
      const deltaPct = (delta / containerWidth) * 100
      setLeftWidthPct(Math.max(MIN_LEFT_PCT, Math.min(MAX_LEFT_PCT, dragStartPct.current + deltaPct)))
    }

    const onMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [leftWidthPct])

  // Mode switching: clear selection
  const handleViewModeChange = useCallback((mode: typeof viewMode) => {
    setSelectedEntityId(null)
    setSelectedSourceId(null)
    setViewMode(mode)
  }, [setViewMode, setSelectedEntityId])

  const handleClusterClick = useCallback((cluster: ClusterData) => {
    enterNeighborhood(cluster.anchor.id)
  }, [enterNeighborhood])

  const handleSelectEntity = useCallback((entity: EntityNode | null) => {
    setSelectedEntityId(entity?.id ?? null)
  }, [setSelectedEntityId])

  const handleSelectSource = useCallback((source: SourceNode | null) => {
    setSelectedSourceId(source?.id ?? null)
  }, [])

  const handleSourcesLoaded = useCallback((sources: SourceNode[], edges: SourceEdge[]) => {
    setAllSources(sources)
    setSourceEdges(edges)
  }, [])

  const handleEntitiesLoaded = useCallback((entities: EntityNode[]) => {
    setNeighborhoodEntities(entities)
  }, [])

  const handleEdgesLoaded = useCallback((edges: EntityEdge[]) => {
    setNeighborhoodEdges(edges)
  }, [])

  const handleToggleShowEdges = useCallback(() => {
    setShowEdges(prev => !prev)
  }, [setShowEdges])

  // Shared toolbar props
  const toolbarProps = {
    viewMode,
    onViewModeChange: handleViewModeChange,
    filters,
    onToggleAnchor: toggleAnchor,
    onToggleSpotlight: toggleSpotlight,
    onRecencyChange: setRecency,
    clusters,
    isNeighborhood,
    showEdges,
    onToggleShowEdges: handleToggleShowEdges,
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-content)' }}>
        <ExploreToolbar {...toolbarProps} clusters={[]} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-content)' }}>
        <ExploreToolbar {...toolbarProps} clusters={[]} />
        <div className="flex-1 flex items-center justify-center">
          <ErrorBanner message={error.message} onRetry={refetch} />
        </div>
      </div>
    )
  }

  // Empty state — no anchors (entities mode only; sources can still render)
  if (clusters.length === 0 && viewMode === 'entities') {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-content)' }}>
        <ExploreToolbar {...toolbarProps} clusters={[]} />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-content)' }}>
      <ExploreToolbar {...toolbarProps} />

      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden"
        style={{
          userSelect: isDragging ? 'none' : undefined,
          cursor: isDragging ? 'col-resize' : undefined,
        }}
      >
        {/* ── LEFT: Graph visualization ── */}
        <div
          className="h-full overflow-hidden"
          style={{
            width: `${leftWidthPct}%`,
            flexShrink: 0,
            transition: isDragging ? 'none' : 'width 0.2s ease',
          }}
        >
          {/* Landscape (cluster bubbles) */}
          {viewMode === 'entities' && !isNeighborhood && (
            <LandscapeView
              clusters={clusters}
              stats={stats}
              unclustered={unclustered}
              isClusterVisible={isClusterVisible}
              onClusterClick={handleClusterClick}
            />
          )}

          {/* Neighborhood (entity nodes within a cluster) */}
          {viewMode === 'entities' && isNeighborhood && activeCluster && (
            <NeighborhoodView
              cluster={activeCluster}
              allClusters={clusters}
              filters={filters}
              showEdges={showEdges}
              selectedEntityId={selectedEntityId}
              onSelectEntity={handleSelectEntity}
              onBack={returnToLandscape}
              onEntitiesLoaded={handleEntitiesLoaded}
              onEdgesLoaded={handleEdgesLoaded}
            />
          )}

          {/* Source graph */}
          {viewMode === 'sources' && (
            <SourceGraphView
              filters={filters}
              selectedSourceId={selectedSourceId}
              onSelectSource={handleSelectSource}
              onSourcesLoaded={handleSourcesLoaded}
            />
          )}
        </div>

        {/* ── Resize handle ── */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          onMouseDown={handleDividerMouseDown}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
          style={{
            width: 16,
            cursor: 'col-resize',
            position: 'relative',
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: 2,
            background: (isDragging || isHandleHovered) ? 'var(--color-accent-500)' : 'var(--border-subtle)',
            transition: 'background 0.15s ease',
            borderRadius: 1,
          }} />
          <GripVertical
            size={14}
            style={{
              position: 'relative',
              zIndex: 1,
              color: (isDragging || isHandleHovered) ? 'var(--color-accent-500)' : 'var(--color-text-placeholder)',
              transition: 'color 0.15s ease',
              background: 'var(--color-bg-content)',
              borderRadius: 2,
            }}
          />
        </div>

        {/* ── RIGHT: Metadata panel ── */}
        <div
          className="flex-1 h-full overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <ExploreMetadataPanel
            viewMode={viewMode}
            zoomLevel={zoomLevel}
            activeCluster={activeCluster}
            clusters={clusters}
            neighborhoodEntities={neighborhoodEntities}
            neighborhoodEdges={neighborhoodEdges}
            allSources={allSources}
            sourceEdges={sourceEdges}
            selectedEntityId={selectedEntityId}
            selectedSourceId={selectedSourceId}
            onSelectEntity={handleSelectEntity}
            onSelectSource={handleSelectSource}
            onClusterClick={handleClusterClick}
            onBack={returnToLandscape}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        {[80, 60, 90, 50, 70].map((size, i) => (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: 'var(--color-bg-inset)',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        Loading graph…
      </span>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3" style={{ maxWidth: 320, textAlign: 'center' }}>
      <Compass size={32} style={{ color: 'var(--color-text-placeholder)' }} />
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        No anchors yet
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        Promote nodes to anchors in Settings to see your knowledge graph organized into clusters.
      </p>
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'var(--color-semantic-red-50)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 10,
        padding: '12px 18px',
        maxWidth: 420,
      }}
    >
      <AlertCircle size={16} style={{ color: 'var(--color-semantic-red-500)', flexShrink: 0 }} />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--color-semantic-red-700)',
          flex: 1,
        }}
      >
        {message}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 cursor-pointer font-body"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-semantic-red-500)',
          background: 'none',
          border: 'none',
          padding: '4px 8px',
        }}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  )
}
