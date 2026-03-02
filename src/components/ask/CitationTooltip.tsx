import type { InlineCitation } from '../../types/rag'

interface CitationTooltipProps {
  citation: InlineCitation
  rect: DOMRect
}

export function CitationTooltip({ citation, rect }: CitationTooltipProps) {
  return (
    <div
      className="font-body"
      style={{
        position: 'fixed',
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '10px 14px',
        maxWidth: 300,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}
      >
        {citation.label}
      </div>
      <div
        style={{
          display: 'inline-block',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-inset)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 4,
          padding: '1px 5px',
          marginBottom: citation.snippet ? 6 : 0,
        }}
      >
        {citation.entity_type}
      </div>
      {citation.snippet && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
            marginTop: 4,
          }}
        >
          {citation.snippet}…
        </div>
      )}
    </div>
  )
}
