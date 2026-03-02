import type { RelationshipPath } from '../../types/rag'

interface EntityChainProps {
  path: RelationshipPath
  onNodeClick?: (label: string) => void
}

export function EntityChain({ path, onNodeClick }: EntityChainProps) {
  const relationLabel = path.relation.replace(/_/g, ' ').toLowerCase()

  return (
    <div className="flex items-center flex-wrap" style={{ gap: 4, fontSize: 11 }}>
      <button
        type="button"
        className="font-body font-semibold cursor-pointer"
        style={{
          color: 'var(--color-text-primary)',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        onClick={() => onNodeClick?.(path.from)}
      >
        {path.from}
      </button>
      <span className="font-body" style={{ color: 'var(--color-text-placeholder)' }}>→</span>
      <span
        className="font-body"
        style={{
          fontSize: 10,
          fontWeight: 400,
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-inset)',
          padding: '1px 5px',
          borderRadius: 4,
        }}
      >
        {relationLabel}
      </span>
      <span className="font-body" style={{ color: 'var(--color-text-placeholder)' }}>→</span>
      <button
        type="button"
        className="font-body font-semibold cursor-pointer"
        style={{
          color: 'var(--color-text-primary)',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        onClick={() => onNodeClick?.(path.to)}
      >
        {path.to}
      </button>
    </div>
  )
}
