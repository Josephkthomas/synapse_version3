import { AlertCircle, RefreshCw } from 'lucide-react'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { EntityDot } from '../../components/shared/EntityDot'
import { RelationshipTag } from '../../components/shared/RelationshipTag'
import { useNodeNeighbors } from '../../hooks/useNodeNeighbors'
import type { NodeNeighbor } from '../../types/nodes'

interface BrowseExpandedRowProps {
  nodeId: string
  onNavigate: (neighbor: NodeNeighbor) => void
}

export function BrowseExpandedRow({ nodeId, onNavigate }: BrowseExpandedRowProps) {
  const { neighbors, isLoading, error } = useNodeNeighbors(nodeId)

  const visibleNeighbors = neighbors.slice(0, 5)

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        padding: '12px 16px 12px 44px',
        background: 'rgba(240, 240, 240, 0.5)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <SectionLabel>Top Connections</SectionLabel>

      {isLoading && (
        <div className="flex flex-col gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 rounded animate-pulse" style={{ background: 'var(--color-bg-inset)' }} />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 font-body text-[12px] text-text-secondary">
          <AlertCircle size={12} style={{ color: '#ef4444' }} />
          <span>Couldn't load connections.</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 cursor-pointer underline font-body text-[12px]"
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-accent-500)' }}
          >
            <RefreshCw size={10} />
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && neighbors.length === 0 && (
        <p className="font-body text-[12px] text-text-placeholder">No connections found.</p>
      )}

      {!isLoading && !error && neighbors.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {visibleNeighbors.map(({ node, edge, direction }) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onNavigate({ node, edge, direction })}
              className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-left w-full"
              style={{
                background: 'transparent',
                border: 'none',
                height: 28,
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-hover)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <EntityDot type={node.entity_type} size={6} />
              <span className="font-body text-[12px] font-medium text-text-primary flex-1 min-w-0 truncate">
                {node.label}
              </span>
              <RelationshipTag type={edge.relation_type} />
              <span className="font-body text-[10px] text-text-placeholder shrink-0">
                {direction === 'outgoing' ? '→' : '←'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => alert('Coming in PRD 8')}
          className="font-body text-[11px] font-semibold rounded-md cursor-pointer"
          style={{
            padding: '6px 12px',
            background: 'var(--color-accent-50)',
            color: 'var(--color-accent-600)',
            border: '1px solid var(--color-accent-200)',
            borderRadius: 6,
          }}
        >
          Explore with AI
        </button>
        <button
          type="button"
          className="font-body text-[11px] font-semibold rounded-md cursor-pointer"
          style={{
            padding: '6px 12px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-body)',
            borderRadius: 6,
          }}
        >
          Re-link
        </button>
        <button
          type="button"
          className="font-body text-[11px] font-semibold rounded-md cursor-pointer"
          style={{
            padding: '6px 12px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-body)',
            borderRadius: 6,
          }}
        >
          Find Similar
        </button>
      </div>
    </div>
  )
}
