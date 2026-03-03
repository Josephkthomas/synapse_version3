import { TrendingUp, BarChart3, Clock, Star } from 'lucide-react'
import type { PipelineMetrics } from '../../types/pipeline'

interface HealthMetricsProps {
  metrics: PipelineMetrics
  loading: boolean
}

function MetricCard({
  label,
  icon: Icon,
  value,
  subText,
  subColor,
  index,
  loading,
}: {
  label: string
  icon: typeof TrendingUp
  value: string
  subText: string
  subColor: string
  index: number
  loading: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '14px 16px',
        animation: `fadeUp 0.4s ease ${index * 0.05}s both`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          className="font-body"
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </span>
        <Icon size={14} style={{ color: 'var(--color-text-placeholder)' }} />
      </div>
      {loading ? (
        <div
          className="rounded animate-pulse"
          style={{ width: 48, height: 22, background: 'var(--color-bg-inset)', marginTop: 8 }}
        />
      ) : (
        <div
          className="font-display"
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          {value}
        </div>
      )}
      <div
        className="font-body"
        style={{ fontSize: 10, fontWeight: 500, color: subColor }}
      >
        {subText}
      </div>
    </div>
  )
}

export function HealthMetrics({ metrics, loading }: HealthMetricsProps) {
  const weekDiff = metrics.sourcesThisWeek - metrics.sourcesLastWeek
  const weekTrend = weekDiff >= 0 ? `↑ ${weekDiff}` : `↓ ${Math.abs(weekDiff)}`
  const weekColor = weekDiff >= 0 ? 'var(--semantic-green-500, #22c55e)' : 'var(--semantic-red-500, #ef4444)'

  const avgSec = metrics.avgDuration > 0 ? (metrics.avgDuration / 1000).toFixed(1) : '—'
  const fastSec = metrics.fastestDuration > 0 ? (metrics.fastestDuration / 1000).toFixed(0) : '—'
  const slowSec = metrics.slowestDuration > 0 ? (metrics.slowestDuration / 1000).toFixed(0) : '—'
  const durationColor = metrics.avgDuration < 10000
    ? 'var(--semantic-green-500, #22c55e)'
    : metrics.avgDuration < 30000
      ? 'var(--semantic-amber-500, #f59e0b)'
      : 'var(--color-text-secondary)'

  const ratingDisplay = metrics.ratedCount > 0 ? metrics.avgRating.toFixed(1) : '—'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
      <MetricCard
        label="Sources This Week"
        icon={TrendingUp}
        value={String(metrics.sourcesThisWeek)}
        subText={`${weekTrend} vs last week`}
        subColor={weekColor}
        index={0}
        loading={loading}
      />
      <MetricCard
        label="Entities Extracted"
        icon={BarChart3}
        value={String(metrics.entitiesThisWeek)}
        subText={`Avg ${metrics.avgEntitiesPerSource} per source`}
        subColor="var(--color-text-secondary)"
        index={1}
        loading={loading}
      />
      <MetricCard
        label="Avg Processing Time"
        icon={Clock}
        value={`${avgSec}s`}
        subText={`Fastest: ${fastSec}s · Slowest: ${slowSec}s`}
        subColor={durationColor}
        index={2}
        loading={loading}
      />
      <MetricCard
        label="Quality Score"
        icon={Star}
        value={ratingDisplay}
        subText={metrics.ratedCount > 0 ? `${metrics.ratedCount} rated extractions` : 'No ratings yet'}
        subColor="var(--color-text-secondary)"
        index={3}
        loading={loading}
      />
    </div>
  )
}
