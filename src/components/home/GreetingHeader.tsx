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
        <div className="flex gap-3 mt-1">
          {[120, 90, 110].map(w => (
            <div
              key={w}
              className="rounded animate-pulse"
              style={{ width: w, height: 13, background: 'var(--color-bg-inset)' }}
            />
          ))}
        </div>
      )
    }

    if (error || !stats) {
      return (
        <p className="font-body mt-1" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          — sources · — entities · — relationships
        </p>
      )
    }

    if (
      stats.sourcesProcessed === 0 &&
      stats.newEntities === 0 &&
      stats.relationshipsDiscovered === 0
    ) {
      return (
        <p className="font-body mt-1" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          No activity yet today — ready when you are.
        </p>
      )
    }

    return (
      <p className="font-body mt-1" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        {stats.sourcesProcessed} sources processed today
        {' · '}
        {stats.newEntities} new entities
        {' · '}
        {stats.relationshipsDiscovered} relationships discovered
      </p>
    )
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h1
        className="font-display font-extrabold text-text-primary"
        style={{ fontSize: 26, letterSpacing: '-0.02em' }}
      >
        {getGreeting()}, {name}
      </h1>
      {renderStatsLine()}
    </div>
  )
}
