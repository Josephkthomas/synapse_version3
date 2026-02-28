interface ConfidenceBarProps {
  confidence: number | null | undefined
  width?: number
  height?: number
  showText?: boolean
}

export function ConfidenceBar({ confidence, width = 40, height = 4, showText = true }: ConfidenceBarProps) {
  const pct = confidence != null ? Math.round(confidence * 100) : null

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="shrink-0 rounded-full overflow-hidden"
        style={{ width, height, background: 'var(--color-bg-inset)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct ?? 0}%`,
            background: 'var(--color-accent-500)',
          }}
        />
      </div>
      {showText && (
        <span className="font-body text-[10px] text-text-secondary">
          {pct != null ? `${pct}%` : '—'}
        </span>
      )}
    </div>
  )
}
