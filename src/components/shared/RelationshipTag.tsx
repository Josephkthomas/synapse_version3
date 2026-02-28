interface RelationshipTagProps {
  type: string | null | undefined
}

export function RelationshipTag({ type }: RelationshipTagProps) {
  const label = type ?? 'relates_to'

  return (
    <span
      className="inline-flex items-center font-body font-semibold text-text-secondary rounded shrink-0"
      style={{
        fontSize: '9px',
        padding: '2px 5px',
        background: 'var(--color-bg-inset)',
        borderRadius: '4px',
      }}
    >
      {label.replace(/_/g, ' ')}
    </span>
  )
}
