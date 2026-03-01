import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getSourceConfig } from '../../config/sourceTypes'
import { getEntityColor } from '../../config/entityTypes'
import { useGraphContext } from '../../hooks/useGraphContext'
import { fetchNodeById, fetchSourceById } from '../../services/supabase'
import { stripMarkdown } from '../../utils/stripMarkdown'
import type { FeedItem, FeedEntityBadge } from '../../types/feed'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Entity Row (entities panel) ─────────────────────────────────────────────

function EntityRow({
  entity,
  onNodeClick,
}: {
  entity: FeedEntityBadge
  onNodeClick: (nodeId: string, e: React.MouseEvent) => void
}) {
  const color = getEntityColor(entity.entityType)

  return (
    <button
      type="button"
      onClick={e => onNodeClick(entity.id, e)}
      className="w-full text-left flex items-center justify-between cursor-pointer rounded-md"
      style={{
        padding: '5px 8px',
        background: 'transparent',
        border: 'none',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-inset)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span
          className="font-body"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entity.label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0" style={{ marginLeft: 8 }}>
        <span
          className="font-body font-semibold"
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            color,
            background: `${color}10`,
            border: `1px solid ${color}29`,
            lineHeight: 1.4,
          }}
        >
          {entity.entityType}
        </span>
        {entity.confidence != null && (
          <span
            className="font-body"
            style={{ fontSize: 10, color: 'var(--color-text-placeholder)', minWidth: 30, textAlign: 'right' }}
          >
            {Math.round(entity.confidence * 100)}%
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Connection Table Row ─────────────────────────────────────────────────────

type UnifiedConnection = {
  id: string
  fromNodeId: string
  fromLabel: string
  fromEntityType: string
  toNodeId: string
  toLabel: string
  toEntityType: string
  relationType: string
  isExternal: boolean
  sourceName: string | null
  toSourceId: string | null
}

function EntityCell({
  nodeId,
  label,
  entityType,
  onNodeClick,
}: {
  nodeId: string
  label: string
  entityType: string
  onNodeClick: (nodeId: string, e: React.MouseEvent) => void
}) {
  const color = getEntityColor(entityType)
  return (
    <button
      type="button"
      onClick={e => onNodeClick(nodeId, e)}
      className="flex items-center gap-1 cursor-pointer rounded min-w-0 w-full text-left"
      style={{ background: 'none', border: 'none', padding: 0 }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 10,
          fontWeight: 600,
          padding: '1px 5px',
          borderRadius: 4,
          color,
          background: `${color}10`,
          border: `1px solid ${color}29`,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          cursor: 'pointer',
        }}
      >
        {label}
      </span>
      <span
        className="font-body"
        style={{
          fontSize: 9,
          color: 'var(--color-text-placeholder)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {entityType}
      </span>
    </button>
  )
}

function ConnectionTableRow({
  conn,
  onNodeClick,
  onSourceClick,
}: {
  conn: UnifiedConnection
  onNodeClick: (nodeId: string, e: React.MouseEvent) => void
  onSourceClick: (sourceId: string, e: React.MouseEvent) => void
}) {
  const sourceLabel = conn.isExternal ? (conn.sourceName ?? 'External') : 'This source'

  return (
    <div
      className="rounded-md"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 1fr 90px',
        gap: '0 6px',
        padding: '4px 8px',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-inset)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* From entity */}
      <EntityCell
        nodeId={conn.fromNodeId}
        label={conn.fromLabel}
        entityType={conn.fromEntityType}
        onNodeClick={onNodeClick}
      />

      {/* Relation */}
      <span
        className="font-body"
        style={{
          fontSize: 10,
          color: 'var(--color-text-placeholder)',
          textAlign: 'center',
          alignSelf: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={conn.relationType.replace(/_/g, ' ')}
      >
        {conn.relationType.replace(/_/g, ' ')}
      </span>

      {/* To entity */}
      <EntityCell
        nodeId={conn.toNodeId}
        label={conn.toLabel}
        entityType={conn.toEntityType}
        onNodeClick={onNodeClick}
      />

      {/* Source — clickable when external and has a sourceId */}
      {conn.isExternal && conn.toSourceId ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            if (conn.toSourceId) onSourceClick(conn.toSourceId, e)
          }}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 10,
            textAlign: 'right',
            alignSelf: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--color-accent-500)',
            background: 'none',
            border: 'none',
            padding: 0,
            textDecoration: 'underline',
            textDecorationColor: 'rgba(214,58,0,0.3)',
            textUnderlineOffset: 2,
          }}
          title={`Open: ${sourceLabel}`}
        >
          {sourceLabel}
        </button>
      ) : (
        <span
          className="font-body font-semibold"
          style={{
            fontSize: 10,
            textAlign: 'right',
            alignSelf: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--color-text-placeholder)',
          }}
        >
          {sourceLabel}
        </span>
      )}
    </div>
  )
}

// ─── Pill Toggle Button ───────────────────────────────────────────────────────

function PillToggle({
  count,
  label,
  open,
  onToggle,
}: {
  count: number
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        onToggle()
      }}
      className="inline-flex items-center gap-1 font-body font-semibold cursor-pointer"
      style={{
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 20,
        border: open ? '1px solid rgba(214,58,0,0.2)' : '1px solid var(--border-subtle)',
        background: open ? 'rgba(214,58,0,0.07)' : 'var(--color-bg-inset)',
        color: open ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
        transition: 'all 0.15s ease',
      }}
    >
      {count} {label}
      {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
    </button>
  )
}

// ─── Filter Tab ───────────────────────────────────────────────────────────────

type ConnectionFilter = 'all' | 'internal' | 'external'

function FilterTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      className="font-body font-semibold cursor-pointer"
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 6,
        border: active ? '1px solid rgba(214,58,0,0.2)' : '1px solid transparent',
        background: active ? 'rgba(214,58,0,0.07)' : 'transparent',
        color: active ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
        transition: 'all 0.12s ease',
      }}
    >
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  )
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem
  animDelay: number
}

export function FeedCard({ item, animDelay }: FeedCardProps) {
  const { setRightPanelContent } = useGraphContext()
  const [entitiesOpen, setEntitiesOpen] = useState(false)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all')

  const cfg = getSourceConfig(item.source.source_type)

  const handleSourceClick = () => {
    setRightPanelContent({ type: 'source', data: item.source })
  }

  const handleNodeClick = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = await fetchNodeById(nodeId)
    if (node) setRightPanelContent({ type: 'node', data: node })
  }

  const handleSourceLinkClick = async (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const source = await fetchSourceById(sourceId)
    if (source) setRightPanelContent({ type: 'source', data: source })
  }

  // Build unified list combining within-source and cross-source connections
  const allConnections: UnifiedConnection[] = useMemo(() => [
    ...item.withinSourceConnections.map(cc => ({
      ...cc,
      isExternal: false,
      sourceName: null,
      toSourceId: null,
    })),
    ...item.crossConnections.map(cc => ({
      ...cc,
      isExternal: true,
      sourceName: cc.toSourceTitle,
      toSourceId: cc.toSourceId,
    })),
  ], [item.withinSourceConnections, item.crossConnections])

  const filteredConnections = useMemo(() => {
    if (connectionFilter === 'internal') return allConnections.filter(c => !c.isExternal)
    if (connectionFilter === 'external') return allConnections.filter(c => c.isExternal)
    return allConnections
  }, [allConnections, connectionFilter])

  const internalCount = item.withinSourceConnections.length
  const externalCount = item.crossConnections.length

  return (
    <div
      className="rounded-[12px]"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '14px 16px',
        marginBottom: 8,
        animation: 'fadeUp 0.4s ease both',
        animationDelay: `${animDelay}s`,
      }}
    >
      {/* ── Header: clickable → opens SourceDetail ── */}
      <button
        type="button"
        onClick={handleSourceClick}
        className="w-full text-left flex items-center gap-2.5 rounded-md"
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px 4px',
          margin: '-2px -4px',
          transition: 'background 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-inset)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 26, height: 26, borderRadius: 6, background: cfg.color + '1A', fontSize: 12 }}
        >
          {cfg.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="font-body font-semibold text-text-primary"
            style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {item.source.title ?? 'Untitled Source'}
          </p>
          <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {formatRelativeTime(item.source.created_at)}
          </p>
        </div>
      </button>

      {/* ── Summary ── */}
      {item.summary && (
        <p
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--color-text-body)',
            lineHeight: 1.5,
            marginTop: 8,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {stripMarkdown(item.summary)}
        </p>
      )}

      {/* ── Pill toggles ── */}
      {(item.entityCount > 0 || allConnections.length > 0) && (
        <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
          {item.entityCount > 0 && (
            <PillToggle
              count={item.entityCount}
              label="entities"
              open={entitiesOpen}
              onToggle={() => setEntitiesOpen(v => !v)}
            />
          )}
          {allConnections.length > 0 && (
            <PillToggle
              count={allConnections.length}
              label="connections"
              open={connectionsOpen}
              onToggle={() => {
                setConnectionsOpen(v => !v)
                if (!connectionsOpen) setConnectionFilter('all')
              }}
            />
          )}
        </div>
      )}

      {/* ── Entities panel ── */}
      {entitiesOpen && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '0 8px',
              padding: '0 8px 4px',
            }}
          >
            <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>Entity</span>
            <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>Type</span>
            <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Confidence</span>
          </div>
          <div>
            {item.entities.map(entity => (
              <EntityRow key={entity.id} entity={entity} onNodeClick={handleNodeClick} />
            ))}
          </div>
          {item.entityCount > item.entities.length && (
            <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-placeholder)', padding: '4px 8px 0' }}>
              +{item.entityCount - item.entities.length} more · open source to view all
            </p>
          )}
        </div>
      )}

      {/* ── Connections panel ── */}
      {connectionsOpen && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>

          {/* Filter tabs + column headers */}
          <div className="flex items-center justify-between" style={{ padding: '0 4px', marginBottom: 4 }}>
            <div className="flex items-center gap-1">
              <FilterTab
                active={connectionFilter === 'all'}
                label="All"
                count={internalCount + externalCount}
                onClick={() => setConnectionFilter('all')}
              />
              {internalCount > 0 && (
                <FilterTab
                  active={connectionFilter === 'internal'}
                  label="Within source"
                  count={internalCount}
                  onClick={() => setConnectionFilter('internal')}
                />
              )}
              {externalCount > 0 && (
                <FilterTab
                  active={connectionFilter === 'external'}
                  label="Other sources"
                  count={externalCount}
                  onClick={() => setConnectionFilter('external')}
                />
              )}
            </div>
          </div>

          {/* Table header */}
          {filteredConnections.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 1fr 90px',
                gap: '0 6px',
                padding: '2px 8px 4px',
              }}
            >
              <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>From</span>
              <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Relation</span>
              <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>To</span>
              <span className="font-display font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.07em', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Source</span>
            </div>
          )}

          {/* Rows */}
          {filteredConnections.length > 0 ? (
            filteredConnections.map(conn => (
              <ConnectionTableRow key={conn.id} conn={conn} onNodeClick={handleNodeClick} onSourceClick={handleSourceLinkClick} />
            ))
          ) : (
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-placeholder)', padding: '4px 8px' }}>
              No connections to show.
            </p>
          )}

          {/* Note if relation count exceeds what's stored */}
          {item.relationCount > allConnections.length && (
            <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-placeholder)', padding: '4px 8px 0' }}>
              Showing {allConnections.length} of {item.relationCount} connections
            </p>
          )}
        </div>
      )}
    </div>
  )
}
