import type { HeatmapCell } from '../../types/pipeline'

const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']

const LEVEL_COLORS: [string, string, string, string, string, string] = [
  'var(--color-bg-inset)',
  'rgba(214,58,0,0.12)',
  'rgba(214,58,0,0.25)',
  'rgba(214,58,0,0.45)',
  'rgba(214,58,0,0.65)',
  'rgba(214,58,0,0.85)',
]

function getCellColor(count: number): string {
  if (count === 0) return LEVEL_COLORS[0]
  if (count === 1) return LEVEL_COLORS[1]
  if (count === 2) return LEVEL_COLORS[2]
  if (count === 3) return LEVEL_COLORS[3]
  if (count === 4) return LEVEL_COLORS[4]
  return LEVEL_COLORS[5]
}

interface ExtractionHeatmapProps {
  cells: HeatmapCell[]
  loading: boolean
  selectedDay: { week: number; day: number } | null
  onSelectDay: (week: number, day: number) => void
  onClearDay: () => void
}

export function ExtractionHeatmap({
  cells,
  loading,
  selectedDay,
  onSelectDay,
  onClearDay,
}: ExtractionHeatmapProps) {
  // Build a quick lookup
  const cellMap = new Map<string, HeatmapCell>()
  for (const c of cells) cellMap.set(`${c.week}-${c.day}`, c)

  const handleCellClick = (week: number, day: number) => {
    const cell = cellMap.get(`${week}-${day}`)
    if (!cell || cell.count === 0) return
    if (selectedDay && selectedDay.week === week && selectedDay.day === day) {
      onClearDay()
    } else {
      onSelectDay(week, day)
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span
          className="font-body"
          style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}
        >
          Extraction Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedDay && (
            <button
              type="button"
              onClick={onClearDay}
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--color-accent-500)',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear selection
            </button>
          )}
          <span
            className="font-body"
            style={{ fontSize: 10, color: 'var(--color-text-placeholder)' }}
          >
            Last 13 weeks · click a day to drill down
          </span>
        </div>
      </div>

      {loading ? (
        <div
          className="animate-pulse rounded"
          style={{ height: 100, background: 'var(--color-bg-inset)' }}
        />
      ) : (
        <>
          {/* Grid */}
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, paddingTop: 0 }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="font-body"
                  style={{
                    width: 14,
                    height: 11,
                    fontSize: 8,
                    color: 'var(--color-text-placeholder)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {Array.from({ length: 13 }, (_, week) => (
              <div key={week} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 7 }, (_, day) => {
                  const cell = cellMap.get(`${week}-${day}`)
                  const count = cell?.count ?? 0
                  const isSelected = selectedDay?.week === week && selectedDay?.day === day

                  return (
                    <div
                      key={day}
                      onClick={() => handleCellClick(week, day)}
                      title={cell ? `${cell.date}: ${count} extraction${count !== 1 ? 's' : ''}` : ''}
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 2,
                        background: getCellColor(count),
                        cursor: count > 0 ? 'pointer' : 'default',
                        outline: isSelected ? '2px solid var(--color-accent-500)' : undefined,
                        outlineOffset: isSelected ? 1 : undefined,
                        transition: 'outline 0.15s ease',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              marginTop: 8,
            }}
          >
            <span
              className="font-body"
              style={{ fontSize: 9, color: 'var(--color-text-placeholder)', marginRight: 2 }}
            >
              Less
            </span>
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                style={{ width: 11, height: 11, borderRadius: 2, background: color }}
              />
            ))}
            <span
              className="font-body"
              style={{ fontSize: 9, color: 'var(--color-text-placeholder)', marginLeft: 2 }}
            >
              More
            </span>
          </div>
        </>
      )}
    </div>
  )
}
