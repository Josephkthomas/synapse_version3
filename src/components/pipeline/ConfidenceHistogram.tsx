const BUCKET_LABELS = ['0.5–0.6', '0.6–0.7', '0.7–0.8', '0.8–0.9', '0.9–1.0']
const BUCKET_COLORS = [
  'var(--color-bg-active, #e5e7eb)',
  'var(--color-bg-active, #e5e7eb)',
  'rgba(214,58,0,0.40)',
  'rgba(214,58,0,0.90)',
  'rgba(214,58,0,0.60)',
]

interface ConfidenceHistogramProps {
  buckets: number[] // 5 values
  dayView?: boolean
}

export function ConfidenceHistogram({ buckets, dayView }: ConfidenceHistogramProps) {
  const maxBucket = Math.max(...buckets, 1)
  const total = buckets.reduce((sum, b) => sum + b, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span
          className="font-body"
          style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}
        >
          Confidence Distribution
        </span>
        {dayView && (
          <span
            className="font-body"
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--color-accent-500)',
              background: 'var(--color-accent-50)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            Day view
          </span>
        )}
      </div>

      {total === 0 ? (
        <div
          className="font-body"
          style={{ fontSize: 11, color: 'var(--color-text-placeholder)', textAlign: 'center', padding: '12px 0' }}
        >
          No confidence data
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 3, height: 44, alignItems: 'flex-end' }}>
          {buckets.map((count, i) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const heightPct = (count / maxBucket) * 100
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span className="font-body" style={{ fontSize: 8, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {pct}%
                </span>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(heightPct, 4)}%`,
                    borderRadius: '3px 3px 0 0',
                    background: BUCKET_COLORS[i],
                    transition: 'height 0.4s ease',
                  }}
                />
                <span className="font-body" style={{ fontSize: 8, color: 'var(--color-text-placeholder)' }}>
                  {BUCKET_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
