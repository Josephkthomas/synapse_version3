interface ProcessingSparklineProps {
  dailyDurations: number[] // array of avg durations in seconds, length <= 14
  selectedDayDuration?: number // seconds, shown when a heatmap day is selected
}

export function ProcessingSparkline({ dailyDurations, selectedDayDuration }: ProcessingSparklineProps) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span
          className="font-body"
          style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}
        >
          {selectedDayDuration !== undefined ? 'Processing Time' : 'Processing Time (14D)'}
        </span>
      </div>

      {selectedDayDuration !== undefined ? (
        // Single metric for selected day
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            className="font-display"
            style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}
          >
            {selectedDayDuration.toFixed(1)}s
          </span>
          <span
            className="font-body"
            style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
          >
            average on this day
          </span>
        </div>
      ) : (
        <>
          {dailyDurations.length === 0 ? (
            <div
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-placeholder)', textAlign: 'center', padding: '12px 0' }}
            >
              No processing data
            </div>
          ) : (
            <>
              {/* 14-bar sparkline */}
              <div style={{ display: 'flex', gap: 2, height: 32, alignItems: 'flex-end' }}>
                {(() => {
                  const maxVal = Math.max(...dailyDurations, 0.1)
                  const p80 = [...dailyDurations].sort((a, b) => a - b)[Math.floor(dailyDurations.length * 0.8)] ?? maxVal

                  return dailyDurations.map((dur, i) => {
                    const heightPct = (dur / maxVal) * 100
                    const isHigh = dur > p80
                    return (
                      <div
                        key={i}
                        title={`${dur.toFixed(1)}s`}
                        style={{
                          flex: 1,
                          height: `${Math.max(heightPct, 6)}%`,
                          borderRadius: '2px 2px 0 0',
                          background: isHigh
                            ? 'rgba(245,158,11,0.6)' // amber for high
                            : 'rgba(214,58,0,0.3)', // accent for normal
                          transition: 'height 0.4s ease',
                        }}
                      />
                    )
                  })
                })()}
              </div>

              {/* Axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="font-body" style={{ fontSize: 8, color: 'var(--color-text-placeholder)' }}>
                  14d ago
                </span>
                <span className="font-body" style={{ fontSize: 8, color: 'var(--color-text-placeholder)' }}>
                  Today
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
