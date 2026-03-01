interface ContentColumnProps {
  children: React.ReactNode
  maxWidth?: number
  className?: string
  leftAlign?: boolean
}

export function ContentColumn({
  children,
  maxWidth = 840,
  className,
  leftAlign = false,
}: ContentColumnProps) {
  return (
    <div
      className={`h-full overflow-y-auto ${className ?? ''}`}
      style={{ background: 'var(--color-bg-content)' }}
    >
      <div
        style={{
          maxWidth: leftAlign ? undefined : maxWidth,
          margin: leftAlign ? 0 : '0 auto',
          padding: '28px 32px',
        }}
      >
        {children}
      </div>
    </div>
  )
}
