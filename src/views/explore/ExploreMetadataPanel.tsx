import { useRef, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, ChevronRight, GitBranch, Link2 } from 'lucide-react'
import { EntityBadge } from '../../components/shared/EntityBadge'
import { ConfidenceBar } from '../../components/shared/ConfidenceBar'
import { getEntityColor } from '../../config/entityTypes'
import { getSourceConfig } from '../../config/sourceTypes'
import type {
  ExploreViewMode,
  ZoomLevel,
  ClusterData,
  EntityNode,
  SourceNode,
  SourceEdge,
} from '../../types/explore'
import type { EntityEdge } from '../../services/exploreQueries'

interface ExploreMetadataPanelProps {
  viewMode: ExploreViewMode
  zoomLevel: ZoomLevel
  activeCluster: ClusterData | null
  clusters: ClusterData[]
  // Neighborhood data
  neighborhoodEntities: EntityNode[]
  neighborhoodEdges: EntityEdge[]
  // Source data
  allSources: SourceNode[]
  sourceEdges: SourceEdge[]
  // Selection
  selectedEntityId: string | null
  selectedSourceId: string | null
  onSelectEntity: (entity: EntityNode | null) => void
  onSelectSource: (source: SourceNode | null) => void
  onClusterClick: (cluster: ClusterData) => void
  onBack: () => void
}

export function ExploreMetadataPanel({
  viewMode,
  zoomLevel,
  activeCluster,
  clusters,
  neighborhoodEntities,
  neighborhoodEdges,
  allSources,
  sourceEdges,
  selectedEntityId,
  selectedSourceId,
  onSelectEntity,
  onSelectSource,
  onClusterClick,
  onBack,
}: ExploreMetadataPanelProps) {
  // Landscape: entities + landscape
  if (viewMode === 'entities' && zoomLevel === 'landscape') {
    return (
      <ClusterListPanel
        clusters={clusters}
        onClusterClick={onClusterClick}
      />
    )
  }

  // Neighborhood: entities + neighborhood
  if (viewMode === 'entities' && zoomLevel === 'neighborhood' && activeCluster) {
    return (
      <EntityTablePanel
        cluster={activeCluster}
        entities={neighborhoodEntities}
        edges={neighborhoodEdges}
        selectedEntityId={selectedEntityId}
        onSelectEntity={onSelectEntity}
        onBack={onBack}
      />
    )
  }

  // Sources
  if (viewMode === 'sources') {
    return (
      <SourceListPanel
        sources={allSources}
        sourceEdges={sourceEdges}
        selectedSourceId={selectedSourceId}
        onSelectSource={onSelectSource}
      />
    )
  }

  return null
}

// ─── Cluster List (Landscape Level) ──────────────────────────────────────────

function ClusterListPanel({
  clusters,
  onClusterClick,
}: {
  clusters: ClusterData[]
  onClusterClick: (cluster: ClusterData) => void
}) {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-card)' }}>
      <PanelHeader>
        Clusters
        <CountBadge>{clusters.length}</CountBadge>
      </PanelHeader>

      <div className="flex-1 overflow-y-auto" style={{ padding: '8px 16px' }}>
        {clusters.length === 0 && (
          <EmptyText>No clusters yet. Promote entities to anchors in Settings.</EmptyText>
        )}
        {clusters.map(cluster => {
          const maxTypeCount = Math.max(...cluster.typeDistribution.map(t => t.count), 1)
          return (
            <button
              key={cluster.anchor.id}
              type="button"
              onClick={() => onClusterClick(cluster)}
              className="flex flex-col w-full cursor-pointer font-body"
              style={{
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderRadius: 10,
                textAlign: 'left',
                transition: 'background 0.1s ease',
                marginBottom: 2,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-inset)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* Row 1: Anchor name + entity count */}
              <div className="flex items-center gap-2 w-full" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getEntityColor(cluster.anchor.entityType),
                    flexShrink: 0,
                  }}
                />
                <span
                  className="flex-1"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cluster.anchor.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {cluster.entityCount}
                </span>
              </div>

              {/* Row 2: Type distribution mini bars */}
              <div className="flex items-center gap-1" style={{ marginBottom: 4 }}>
                {cluster.typeDistribution.slice(0, 5).map(t => (
                  <div
                    key={t.entityType}
                    title={`${t.entityType}: ${t.count}`}
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: getEntityColor(t.entityType),
                      width: Math.max((t.count / maxTypeCount) * 60, 6),
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>

              {/* Row 3: Stats line */}
              <div
                className="flex items-center gap-3"
                style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
              >
                <span>{cluster.typeDistribution.length} types</span>
                {cluster.crossClusterEdges.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Link2 size={9} />
                    {cluster.crossClusterEdges.length} connected
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Entity Table (Neighborhood Level) ───────────────────────────────────────

function EntityTablePanel({
  cluster,
  entities,
  edges,
  selectedEntityId,
  onSelectEntity,
  onBack,
}: {
  cluster: ClusterData
  entities: EntityNode[]
  edges: EntityEdge[]
  selectedEntityId: string | null
  onSelectEntity: (entity: EntityNode | null) => void
  onBack: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected entity into view
  useEffect(() => {
    if (!selectedEntityId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-entity-id="${selectedEntityId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedEntityId])

  // Compute connection counts from edges
  const connectionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of edges) {
      map.set(e.sourceNodeId, (map.get(e.sourceNodeId) ?? 0) + 1)
      map.set(e.targetNodeId, (map.get(e.targetNodeId) ?? 0) + 1)
    }
    return map
  }, [edges])

  // Find edges for the selected entity
  const selectedEntityEdges = useMemo(() => {
    if (!selectedEntityId) return []
    return edges.filter(
      e => e.sourceNodeId === selectedEntityId || e.targetNodeId === selectedEntityId
    )
  }, [edges, selectedEntityId])

  const selectedEntity = entities.find(e => e.id === selectedEntityId)

  // Get neighbor labels for selected entity detail
  const getNeighborLabel = useCallback((entityId: string) => {
    return entities.find(e => e.id === entityId)?.label ?? entityId
  }, [entities])

  const getNeighborType = useCallback((entityId: string) => {
    return entities.find(e => e.id === entityId)?.entityType ?? 'Unknown'
  }, [entities])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-card)' }}>
      {/* Header with back button */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            padding: 2,
            color: 'var(--color-text-secondary)',
          }}
        >
          <ArrowLeft size={14} />
        </button>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: getEntityColor(cluster.anchor.entityType),
            flexShrink: 0,
          }}
        />
        <span
          className="font-display"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cluster.anchor.label}
        </span>
        <CountBadge>{entities.length}</CountBadge>
      </div>

      {/* Stats */}
      <div
        className="flex items-center gap-3 shrink-0 font-body"
        style={{
          padding: '8px 16px',
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span>{entities.length} entities</span>
        <span>·</span>
        <span>{edges.length} edges</span>
      </div>

      {/* Entity list */}
      <div ref={listRef} className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
        {entities.map(entity => {
          const isSelected = selectedEntityId === entity.id
          const connCount = connectionCounts.get(entity.id) ?? 0

          return (
            <div key={entity.id} data-entity-id={entity.id}>
              <button
                type="button"
                onClick={() => onSelectEntity(isSelected ? null : entity)}
                className="flex items-center w-full cursor-pointer font-body"
                style={{
                  padding: '8px 10px',
                  background: isSelected ? 'var(--color-accent-50)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  textAlign: 'left',
                  transition: 'background 0.1s ease',
                  gap: 8,
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-inset)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Entity dot */}
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: getEntityColor(entity.entityType),
                    flexShrink: 0,
                  }}
                />

                {/* Label */}
                <span
                  className="flex-1"
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--color-accent-500)' : 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entity.label}
                </span>

                {/* Type badge */}
                <EntityBadge type={entity.entityType} size="xs" />

                {/* Connection count */}
                {connCount > 0 && (
                  <span
                    className="flex items-center gap-0.5"
                    style={{
                      fontSize: 9,
                      color: 'var(--color-text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    <GitBranch size={9} />
                    {connCount}
                  </span>
                )}

                {/* Confidence */}
                {entity.confidence != null && (
                  <span style={{ flexShrink: 0 }}>
                    <ConfidenceBar confidence={entity.confidence} width={28} height={3} showText={false} />
                  </span>
                )}
              </button>

              {/* Inline detail for selected entity */}
              {isSelected && selectedEntity && (
                <div
                  style={{
                    padding: '8px 10px 12px 25px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 4,
                  }}
                >
                  {/* Description */}
                  {selectedEntity.description && (
                    <p
                      className="font-body"
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-body)',
                        lineHeight: 1.5,
                        marginBottom: 8,
                        margin: 0,
                        marginTop: 0,
                      }}
                    >
                      {selectedEntity.description}
                    </p>
                  )}

                  {/* Source */}
                  {selectedEntity.sourceName && (
                    <div
                      className="flex items-center gap-1.5 font-body"
                      style={{
                        fontSize: 10,
                        color: 'var(--color-text-secondary)',
                        marginTop: 6,
                        marginBottom: 8,
                      }}
                    >
                      <span>{getSourceConfig(selectedEntity.sourceType).icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedEntity.sourceName}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedEntity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1" style={{ marginBottom: 8 }}>
                      {selectedEntity.tags.slice(0, 5).map(tag => (
                        <span
                          key={tag}
                          className="font-body"
                          style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--color-bg-inset)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Connections list */}
                  {selectedEntityEdges.length > 0 && (
                    <>
                      <SectionLabel>
                        CONNECTIONS ({selectedEntityEdges.length})
                      </SectionLabel>
                      <div className="flex flex-col gap-0.5">
                        {selectedEntityEdges.slice(0, 8).map(edge => {
                          const otherId = edge.sourceNodeId === selectedEntityId
                            ? edge.targetNodeId
                            : edge.sourceNodeId
                          const otherLabel = getNeighborLabel(otherId)
                          const otherType = getNeighborType(otherId)
                          const direction = edge.sourceNodeId === selectedEntityId ? '→' : '←'

                          return (
                            <button
                              key={`${edge.sourceNodeId}-${edge.targetNodeId}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const other = entities.find(ent => ent.id === otherId)
                                if (other) onSelectEntity(other)
                              }}
                              className="flex items-center gap-1.5 w-full cursor-pointer font-body"
                              style={{
                                padding: '3px 6px',
                                fontSize: 10,
                                background: 'none',
                                border: 'none',
                                borderRadius: 4,
                                textAlign: 'left',
                                color: 'var(--color-text-body)',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-inset)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background: getEntityColor(otherType),
                                  flexShrink: 0,
                                }}
                              />
                              <span className="flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {otherLabel}
                              </span>
                              {edge.relationType && (
                                <span style={{ fontSize: 9, color: 'var(--color-text-placeholder)' }}>
                                  {edge.relationType}
                                </span>
                              )}
                              <span style={{ fontSize: 9, color: 'var(--color-text-placeholder)', flexShrink: 0 }}>
                                {direction}
                              </span>
                              <ChevronRight size={9} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />
                            </button>
                          )
                        })}
                        {selectedEntityEdges.length > 8 && (
                          <span className="font-body" style={{ fontSize: 9, color: 'var(--color-text-placeholder)', padding: '2px 6px' }}>
                            +{selectedEntityEdges.length - 8} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Source List ──────────────────────────────────────────────────────────────

function SourceListPanel({
  sources,
  sourceEdges,
  selectedSourceId,
  onSelectSource,
}: {
  sources: SourceNode[]
  sourceEdges: SourceEdge[]
  selectedSourceId: string | null
  onSelectSource: (source: SourceNode | null) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedSourceId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-source-id="${selectedSourceId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedSourceId])

  // Compute connection counts
  const connectionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of sourceEdges) {
      map.set(e.fromSourceId, (map.get(e.fromSourceId) ?? 0) + 1)
      map.set(e.toSourceId, (map.get(e.toSourceId) ?? 0) + 1)
    }
    return map
  }, [sourceEdges])

  const selectedSource = sources.find(s => s.id === selectedSourceId)

  // Connected sources for selected
  const connectedSources = useMemo(() => {
    if (!selectedSourceId) return []
    return sourceEdges
      .filter(e => e.fromSourceId === selectedSourceId || e.toSourceId === selectedSourceId)
      .map(e => {
        const otherId = e.fromSourceId === selectedSourceId ? e.toSourceId : e.fromSourceId
        const other = sources.find(s => s.id === otherId)
        if (!other) return null
        return { source: other, sharedCount: e.sharedEntityCount }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.sharedCount - a.sharedCount)
  }, [selectedSourceId, sourceEdges, sources])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-card)' }}>
      <PanelHeader>
        Sources
        <CountBadge>{sources.length}</CountBadge>
      </PanelHeader>

      <div ref={listRef} className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
        {sources.length === 0 && (
          <EmptyText>No sources yet. Ingest content to see your source graph.</EmptyText>
        )}
        {sources.map(source => {
          const isSelected = selectedSourceId === source.id
          const cfg = getSourceConfig(source.sourceType)
          const connCount = connectionCounts.get(source.id) ?? 0
          const date = new Date(source.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })

          return (
            <div key={source.id} data-source-id={source.id}>
              <button
                type="button"
                onClick={() => onSelectSource(isSelected ? null : source)}
                className="flex items-center w-full cursor-pointer font-body"
                style={{
                  padding: '10px 10px',
                  background: isSelected ? 'var(--color-accent-50)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  textAlign: 'left',
                  transition: 'background 0.1s ease',
                  gap: 8,
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-inset)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Source icon */}
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: `${cfg.color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {cfg.icon}
                </span>

                {/* Title + meta */}
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--color-accent-500)' : 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {source.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--color-text-secondary)',
                      marginTop: 1,
                    }}
                  >
                    {source.sourceType} · {date} · {source.entityCount} entities
                  </div>
                </div>

                {/* Connection count */}
                {connCount > 0 && (
                  <span
                    className="flex items-center gap-0.5"
                    style={{
                      fontSize: 9,
                      color: 'var(--color-text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    <Link2 size={9} />
                    {connCount}
                  </span>
                )}
              </button>

              {/* Inline detail for selected source */}
              {isSelected && selectedSource && connectedSources.length > 0 && (
                <div
                  style={{
                    padding: '4px 10px 10px 44px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 4,
                  }}
                >
                  <SectionLabel>
                    CONNECTED SOURCES ({connectedSources.length})
                  </SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {connectedSources.slice(0, 6).map(({ source: other, sharedCount }) => {
                      const otherCfg = getSourceConfig(other.sourceType)
                      return (
                        <button
                          key={other.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectSource(other)
                          }}
                          className="flex items-center gap-1.5 w-full cursor-pointer font-body"
                          style={{
                            padding: '3px 6px',
                            fontSize: 10,
                            background: 'none',
                            border: 'none',
                            borderRadius: 4,
                            textAlign: 'left',
                            color: 'var(--color-text-body)',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-inset)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                        >
                          <span style={{ fontSize: 10 }}>{otherCfg.icon}</span>
                          <span className="flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {other.title}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: 'var(--color-text-secondary)',
                              background: 'var(--color-bg-inset)',
                              padding: '0px 4px',
                              borderRadius: 3,
                              flexShrink: 0,
                            }}
                          >
                            {sharedCount} shared
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 shrink-0 font-display"
      style={{
        padding: '14px 16px',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </div>
  )
}

function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-body"
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 6,
        background: 'var(--color-bg-inset)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-display"
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        marginBottom: 4,
        display: 'block',
      }}
    >
      {children}
    </span>
  )
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-body"
      style={{
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        padding: '40px 20px',
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  )
}
