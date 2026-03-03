import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import type { DailyStats } from '../../types/feed'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

interface GreetingHeaderProps {
  stats: DailyStats | null
  loading: boolean
  error: Error | null
}

export function GreetingHeader({ stats, loading, error }: GreetingHeaderProps) {
  const { profile } = useSettings()
  const { user } = useAuth()

  const name =
    profile?.professional_context?.role ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'there'

  const renderStatsLine = () => {
    if (loading) {
      return (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Loading…
        </span>
      )
    }

    if (error || !stats) {
      return (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          — sources · — entities · — relationships
        </span>
      )
    }

    if (
      stats.sourcesProcessed === 0 &&
      stats.newEntities === 0 &&
      stats.relationshipsDiscovered === 0
    ) {
      return (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          No activity yet today
        </span>
      )
    }

    return (
      <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {stats.sourcesProcessed} sources today
        {' · '}
        {stats.newEntities} new entities
        {' · '}
        {stats.relationshipsDiscovered} relationships
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3" style={{ minHeight: 28 }}>
      <span
        className="font-body font-semibold text-text-primary shrink-0"
        style={{ fontSize: 12 }}
      >
        {getGreeting()}, {name}
      </span>
      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', flexShrink: 0 }} />
      {renderStatsLine()}
    </div>
  )
}
