import { TrendingUp, BarChart3, Clock, Star, AlertTriangle, Target } from 'lucide-react'
import { ProviderIcon } from '../shared/ProviderIcon'
import type { PipelineMetrics, PipelineHistoryItem } from '../../types/pipeline'

interface PipelineStatsProps {
  metrics: PipelineMetrics
  allItems: PipelineHistoryItem[]
  loading: boolean
}

export function PipelineStats({ metrics, allItems, loading }: PipelineStatsProps) {
  const avgSec = metrics.avgDuration > 0 ? (metrics.avgDuration / 1000).toFixed(1) : '—'
  const ratingDisplay = metrics.ratedCount > 0 ? metrics.avgRating.toFixed(1) : '—'

  // Compute average confidence across all completed items
  const completedItems = allItems.filter(i => i.status === 'completed' && i.confidence > 0)
  const avgConfidence = completedItems.length > 0
    ? Math.round(completedItems.reduce((sum, i) => sum + i.confidence, 0) / completedItems.length * 100)
    : 0

  const confidenceColor = avgConfidence > 85
    ? 'var(--semantic-green-500, #22c55e)'
    : avgConfidence > 70
      ? 'var(--semantic-amber-500, #f59e0b)'
      : avgConfidence > 0
        ? 'var(--semantic-red-500, #ef4444)'
        : 'var(--color-text-secondary)'

  // Source distribution
  const sourceAgg: Record<string, number> = {}
  for (const item of allItems) {
    if (item.status === 'pending' || item.status === 'processing') continue
    const t = item.sourceType
    sourceAgg[t] = (sourceAgg[t] ?? 0) + 1
  }
  const sourceEntries = Object.entries(sourceAgg).sort((a, b) => b[1] - a[1])
  const maxSourceCount = sourceEntries.length > 0 ? (sourceEntries[0]?.[1] ?? 0) : 0

  const stats = [
    {
      label: 'Sources This Week',
      value: String(metrics.sourcesThisWeek),
      icon: TrendingUp,
      color: 'var(--color-text-primary)',
    },
    {
      label: 'Entities Extracted',
      value: String(metrics.entitiesThisWeek),
      icon: BarChart3,
      color: 'var(--color-text-primary)',
    },
    {
      label: 'Avg Processing Time',
      value: `${avgSec}s`,
      icon: Clock,
      color: 'var(--color-text-primary)',
    },
    {
      label: 'Quality Score',
      value: ratingDisplay,
      icon: Star,
      color: 'var(--color-text-primary)',
    },
    {
      label: 'Failed',
      value: String(metrics.failedThisWeek),
      icon: AlertTriangle,
      color: metrics.failedThisWeek > 0 ? 'var(--semantic-red-500, #ef4444)' : 'var(--color-text-primary)',
    },
    {
      label: 'Avg Confidence',
      value: avgConfidence > 0 ? `${avgConfidence}%` : '—',
      icon: Target,
      color: confidenceColor,
    },
  ]

  return (
    <div style={{ padding: '24px 20px 0' }}>
      {/* Stats Grid */}
      <span
        className="font-body"
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-secondary)',
          display: 'block',
          marginBottom: 10,
        }}
      >
        Pipeline Stats
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 20 }}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--color-bg-inset)',
              borderRadius: 8,
              padding: '10px 12px',
              animation: loading ? undefined : `fadeUp 0.4s ease ${i * 0.04}s both`,
            }}
          >
            {loading ? (
              <div className="animate-pulse" style={{ width: 40, height: 18, background: 'var(--color-bg-card)', borderRadius: 4 }} />
            ) : (
              <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: stat.color, letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <stat.icon size={10} style={{ color: 'var(--color-text-placeholder)' }} />
              <span className="font-body" style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Source Distribution */}
      {sourceEntries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span
            className="font-body"
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
              display: 'block',
              marginBottom: 10,
            }}
          >
            Source Distribution
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sourceEntries.map(([type, count]) => {
              const pct = maxSourceCount > 0 ? (count / maxSourceCount) * 100 : 0
              return (
                <div key={type}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <ProviderIcon sourceType={type} size={18} borderRadius={4} />
                    <span className="font-body" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-body)', flex: 1 }}>
                      {type}
                    </span>
                    <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {count}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--color-bg-inset)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: 'var(--color-accent-400, #ea580c)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: 0 }} />
    </div>
  )
}
