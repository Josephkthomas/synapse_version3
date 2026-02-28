import { GitBranch } from 'lucide-react'
import { EntityDot } from '../../components/shared/EntityDot'
import { EntityBadge } from '../../components/shared/EntityBadge'
import { ConfidenceBar } from '../../components/shared/ConfidenceBar'
import type { NodeWithMeta } from '../../types/nodes'

interface BrowseCardsProps {
  nodes: NodeWithMeta[]
  selectedNodeId: string | null
  onSelectNode: (node: NodeWithMeta) => void
  animationKey: number
}

export function BrowseCards({ nodes, selectedNodeId, onSelectNode, animationKey }: BrowseCardsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 8,
        maxWidth: 840,
        margin: '0 auto',
        padding: '16px 0',
      }}
    >
      {nodes.map((node, idx) => {
        const isSelected = node.id === selectedNodeId
        const delay = idx < 12 ? idx * 0.03 : 0
        const animStyle = {
          animation: `fadeUp 0.4s ease both`,
          animationDelay: `${delay}s`,
        }

        return (
          <button
            key={`${animationKey}-${node.id}`}
            type="button"
            onClick={() => onSelectNode(node)}
            className="text-left cursor-pointer flex flex-col"
            style={{
              ...animStyle,
              background: isSelected ? 'var(--color-accent-50)' : 'var(--color-bg-card)',
              border: `1px solid ${isSelected ? 'var(--color-accent-200)' : 'var(--border-subtle)'}`,
              borderRadius: 12,
              padding: '16px 22px',
              transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'var(--border-default)'
                el.style.transform = 'translateY(-1px)'
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'var(--border-subtle)'
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
              }
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <EntityDot type={node.entity_type} size={10} />
                <span
                  className="font-display font-bold text-text-primary truncate"
                  style={{ fontSize: '14px', letterSpacing: '-0.01em' }}
                >
                  {node.label}
                </span>
              </div>
              <EntityBadge type={node.entity_type} size="xs" />
            </div>

            {/* Description */}
            <p
              className="font-body text-[13px] text-text-body flex-1"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
                marginBottom: 8,
                fontStyle: !node.description ? 'italic' : 'normal',
                color: !node.description ? 'var(--color-text-placeholder)' : undefined,
              }}
            >
              {node.description ?? 'No description'}
            </p>

            {/* Anchors */}
            {node.anchorLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {node.anchorLabels.map(anchor => (
                  <span
                    key={anchor}
                    className="font-body text-[10px] font-semibold rounded-md px-1.5 py-0.5"
                    style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                  >
                    ⚓ {anchor}
                  </span>
                ))}
              </div>
            )}

            {/* Tags */}
            {(node.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {(node.tags ?? []).slice(0, 3).map(tag => (
                  <span key={tag} className="font-body text-[10px] text-text-secondary">
                    #{tag}
                  </span>
                ))}
                {(node.tags?.length ?? 0) > 3 && (
                  <span className="font-body text-[10px] text-text-placeholder">
                    +{(node.tags?.length ?? 0) - 3}
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div
              className="flex items-center justify-between mt-2 pt-2.5"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-1 font-body text-[11px] font-medium text-text-secondary">
                <GitBranch size={12} />
                <span>{node.connectionCount}</span>
              </div>
              <ConfidenceBar confidence={node.confidence} width={32} height={3} />
            </div>
          </button>
        )
      })}
    </div>
  )
}
