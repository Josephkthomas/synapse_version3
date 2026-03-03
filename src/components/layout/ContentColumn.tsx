interface ContentColumnProps {
  children: React.ReactNode
  maxWidth?: number
  className?: string
  leftAlign?: boolean
  fullWidth?: boolean
}

export function ContentColumn({
  children,
  maxWidth = 840,
  className,
  leftAlign = false,
  fullWidth = false,
}: ContentColumnProps) {
  return (
    <div
      className={`h-full overflow-y-auto ${className ?? ''}`}
      style={{ background: 'var(--color-bg-content)' }}
    >
      <div
        style={{
          maxWidth: fullWidth ? undefined : leftAlign ? undefined : maxWidth,
          margin: fullWidth ? 0 : leftAlign ? 0 : '0 auto',
          padding: fullWidth ? 0 : '28px 36px',
        }}
      >
        {children}
      </div>
    </div>
  )
}
