import { getSourceConfig } from '../../config/sourceTypes'
import { getEntityColor } from '../../config/entityTypes'
import { useGraphContext } from '../../hooks/useGraphContext'
import { fetchNodeById } from '../../services/supabase'
import type { FeedItem } from '../../types/feed'

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

interface FeedCardProps {
  item: FeedItem
  animDelay: number
}

export function FeedCard({ item, animDelay }: FeedCardProps) {
  const { setRightPanelContent } = useGraphContext()
  const cfg = getSourceConfig(item.source.source_type)

  const handleCardClick = () => {
    setRightPanelContent({ type: 'source', data: item.source })
  }

  const handleNodeClick = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = await fetchNodeById(nodeId)
    if (node) setRightPanelContent({ type: 'node', data: node })
  }

  return (
    <div
      className="cursor-pointer rounded-[12px]"
      role="article"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '16px 20px',
        marginBottom: 8,
        animation: 'fadeUp 0.4s ease both',
        animationDelay: `${animDelay}s`,
        transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onClick={handleCardClick}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border-default)'
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border-subtle)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Row 1: Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: cfg.color + '1A',
              fontSize: 12,
            }}
          >
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <p
              className="font-body font-semibold text-text-primary"
              style={{
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 320,
              }}
            >
              {item.source.title ?? 'Untitled Source'}
            </p>
            <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {formatRelativeTime(item.source.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {item.entityCount} entities
          </span>
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {item.relationCount} relations
          </span>
        </div>
      </div>

      {/* Row 2: Summary */}
      {item.summary && (
        <p
          className="font-body"
          style={{
            fontSize: 13,
            color: 'var(--color-text-body)',
            lineHeight: 1.5,
            marginBottom: 10,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.summary}
        </p>
      )}

      {/* Row 3: Entity badges */}
      {item.entities.length > 0 && (
        <div
          className="flex flex-wrap gap-1"
          style={{ marginBottom: item.crossConnections.length > 0 ? 0 : undefined }}
        >
          {item.entities.map(badge => {
            const color = getEntityColor(badge.entityType)
            return (
              <button
                key={badge.id}
                type="button"
                onClick={e => handleNodeClick(badge.id, e)}
                className="inline-flex items-center font-body font-semibold rounded cursor-pointer"
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  color,
                  backgroundColor: `${color}10`,
                  border: `1px solid ${color}29`,
                  lineHeight: 1.4,
                  background: `${color}10`,
                }}
              >
                {badge.label}
              </button>
            )
          })}
          {item.entityCount > 6 && (
            <span
              className="font-body inline-flex items-center"
              style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
            >
              +{item.entityCount - 6} more
            </span>
          )}
        </div>
      )}

      {/* Row 4: Cross-connections */}
      {item.crossConnections.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            marginTop: 10,
            paddingTop: 8,
          }}
        >
          <p
            className="font-display font-bold uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'var(--color-text-secondary)',
              marginBottom: 4,
            }}
          >
            Cross-Connections
          </p>
          {item.crossConnections.map(cc => (
            <div
              key={cc.id}
              className="flex items-center flex-wrap"
              style={{ gap: '2px 3px', marginBottom: 2 }}
            >
              <button
                type="button"
                onClick={e => handleNodeClick(cc.fromNodeId, e)}
                className="font-body font-medium cursor-pointer"
                style={{
                  fontSize: 11,
                  color: 'var(--color-accent-500)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                {cc.fromLabel}
              </button>
              <span
                className="font-body"
                style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
              >
                → {cc.relationType.replace(/_/g, ' ')} →
              </span>
              <button
                type="button"
                onClick={e => handleNodeClick(cc.toNodeId, e)}
                className="font-body font-medium cursor-pointer"
                style={{
                  fontSize: 11,
                  color: 'var(--color-accent-500)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                {cc.toLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
