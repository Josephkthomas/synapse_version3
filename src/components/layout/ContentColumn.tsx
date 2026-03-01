interface ContentColumnProps {
  children: React.ReactNode
  maxWidth?: number
  className?: string
}

export function ContentColumn({
  children,
  maxWidth = 840,
  className,
}: ContentColumnProps) {
  return (
    <div
      className={`h-full overflow-y-auto ${className ?? ''}`}
      style={{ background: 'var(--color-bg-content)' }}
    >
      <div style={{ maxWidth, margin: '0 auto', padding: '28px 32px' }}>
        {children}
      </div>
    </div>
  )
}
