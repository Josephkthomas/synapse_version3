import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { EntityDot } from '../../components/shared/EntityDot'
import { EntityBadge } from '../../components/shared/EntityBadge'
import { SourceIcon } from '../../components/shared/SourceIcon'
import { BrowseExpandedRow } from './BrowseExpandedRow'
import type { NodeWithMeta, NodeNeighbor } from '../../types/nodes'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(0, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface BrowseTableProps {
  nodes: NodeWithMeta[]
  selectedNodeId: string | null
  maxConnections: number
  onSelectNode: (node: NodeWithMeta) => void
  onNavigateToNeighbor: (neighbor: NodeNeighbor) => void
  animationKey: number
}

export function BrowseTable({
  nodes,
  selectedNodeId,
  maxConnections,
  onSelectNode,
  onNavigateToNeighbor,
  animationKey,
}: BrowseTableProps) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const handleRowClick = (node: NodeWithMeta) => {
    if (node.id === selectedNodeId) {
      setExpandedRowId(prev => prev === node.id ? null : node.id)
    } else {
      onSelectNode(node)
    }
  }

  const handleChevronClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setExpandedRowId(prev => prev === nodeId ? null : nodeId)
  }

  const safeMax = Math.max(maxConnections, 1)

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Sticky header */}
      <div
        className="grid sticky top-0 z-10"
        style={{
          gridTemplateColumns: 'minmax(200px, 1fr) 100px 120px 140px 120px 80px 90px 80px',
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--border-default)',
          padding: '0 16px',
        }}
      >
        {['Entity', 'Type', 'Anchors', 'Source', 'Tags', 'Conf', 'Conn', 'Time'].map(col => (
          <div
            key={col}
            className="font-display font-bold uppercase text-text-secondary flex items-center"
            style={{ fontSize: '10px', letterSpacing: '0.08em', height: 36 }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div>
        {nodes.map((node, idx) => {
          const isSelected = node.id === selectedNodeId
          const isExpanded = expandedRowId === node.id
          const delay = idx < 12 ? idx * 0.03 : 0
          const tags = [...(node.tags ?? []), ...(node.user_tags ?? [])]
          const pct = node.confidence != null ? Math.round(node.confidence * 100) : null
          const connWidth = Math.round((node.connectionCount / safeMax) * 32)

          return (
            <div
              key={`${animationKey}-${node.id}`}
              style={{
                animation: `fadeUp 0.4s ease both`,
                animationDelay: `${delay}s`,
              }}
            >
              {/* Main row */}
              <div
                role="row"
                aria-selected={isSelected}
                className="grid cursor-pointer"
                style={{
                  gridTemplateColumns: 'minmax(200px, 1fr) 100px 120px 140px 120px 80px 90px 80px',
                  padding: '0 16px',
                  height: 48,
                  background: isSelected ? 'var(--color-accent-50)' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => handleRowClick(node)}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRowClick(node)
                }}
                tabIndex={0}
              >
                {/* Entity */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={e => handleChevronClick(e, node.id)}
                    className="shrink-0 flex items-center justify-center cursor-pointer rounded"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      width: 18,
                      height: 18,
                    }}
                    aria-label="Toggle expand"
                  >
                    <ChevronRight
                      size={12}
                      style={{
                        color: 'var(--color-text-secondary)',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                  <EntityDot type={node.entity_type} size={8} />
                  <span
                    className="font-body font-semibold text-text-primary truncate"
                    style={{ fontSize: '13px' }}
                  >
                    {node.label}
                  </span>
                </div>

                {/* Type */}
                <div className="flex items-center">
                  <EntityBadge type={node.entity_type} size="xs" />
                </div>

                {/* Anchors */}
                <div className="flex items-center gap-1 min-w-0">
                  {node.anchorLabels.length === 0 ? (
                    <span className="font-body text-[10px] text-text-placeholder">—</span>
                  ) : (
                    <>
                      {node.anchorLabels.slice(0, 2).map(anchor => (
                        <span
                          key={anchor}
                          className="font-body font-semibold rounded-md px-1.5 py-0.5 truncate"
                          style={{
                            fontSize: '10px',
                            background: '#fef3c7',
                            color: '#b45309',
                            maxWidth: 50,
                          }}
                        >
                          {anchor}
                        </span>
                      ))}
                      {node.anchorLabels.length > 2 && (
                        <span className="font-body text-[10px] text-text-placeholder">
                          +{node.anchorLabels.length - 2}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Source */}
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  {node.source_type || node.source ? (
                    <>
                      <SourceIcon sourceType={node.source_type} size={20} />
                      <span className="font-body text-[11px] text-text-secondary truncate">
                        {node.source ?? node.source_type ?? '—'}
                      </span>
                    </>
                  ) : (
                    <span className="font-body text-[10px] text-text-placeholder">—</span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1 min-w-0">
                  {tags.length === 0 ? (
                    <span className="font-body text-[10px] text-text-placeholder">—</span>
                  ) : (
                    <>
                      {tags.slice(0, 2).map(tag => (
                        <span key={tag} className="font-body text-[10px] text-text-secondary truncate">
                          #{tag}
                        </span>
                      ))}
                      {tags.length > 2 && (
                        <span className="font-body text-[10px] text-text-placeholder">+{tags.length - 2}</span>
                      )}
                    </>
                  )}
                </div>

                {/* Confidence */}
                <div className="flex items-center">
                  <div className="flex items-center gap-1">
                    <div
                      className="rounded-full overflow-hidden shrink-0"
                      style={{ width: 40, height: 4, background: 'var(--color-bg-inset)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct ?? 0}%`,
                          background: 'var(--color-accent-500)',
                        }}
                      />
                    </div>
                    <span className="font-body text-[10px] text-text-secondary">
                      {pct != null ? `${pct}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Connections */}
                <div className="flex items-center gap-1">
                  <div
                    className="rounded-full overflow-hidden shrink-0"
                    style={{ width: 32, height: 4, background: 'var(--color-bg-inset)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: connWidth, background: 'var(--color-accent-500)' }}
                    />
                  </div>
                  <span className="font-body text-[10px] font-semibold text-text-secondary">
                    {node.connectionCount}
                  </span>
                </div>

                {/* Time */}
                <div className="flex items-center">
                  <span className="font-body text-[10px] text-text-secondary">
                    {formatRelativeTime(node.created_at)}
                  </span>
                </div>
              </div>

              {/* Expanded row */}
              {isExpanded && (
                <BrowseExpandedRow
                  nodeId={node.id}
                  onNavigate={onNavigateToNeighbor}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
