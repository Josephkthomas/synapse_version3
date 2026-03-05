import { useSettings } from '../../hooks/useSettings'
import { useAuth } from '../../hooks/useAuth'
import type { DailyStats } from '../../types/feed'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

interface GraphStatsData {
  nodeCount: number
  edgeCount: number
  sourceCount: number
}

interface GreetingHeaderProps {
  stats: DailyStats | null
  loading: boolean
  error: Error | null
  graphStats?: GraphStatsData | null
  graphStatsLoading?: boolean
}

export function GreetingHeader({ stats, loading, error, graphStats, graphStatsLoading }: GreetingHeaderProps) {
  const { profile } = useSettings()
  const { user } = useAuth()

  const name =
    profile?.professional_context?.role ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'there'

  const renderStatsLine = () => {
    const sty = { fontSize: 12, color: 'var(--color-text-secondary)' } as const

    if (loading && graphStatsLoading) {
      return <span className="font-body" style={sty}>Loading…</span>
    }

    const parts: string[] = []

    // Daily activity
    if (!loading && !error && stats) {
      if (stats.sourcesProcessed > 0) parts.push(`${stats.sourcesProcessed} source${stats.sourcesProcessed === 1 ? '' : 's'} today`)
    }

    // Overall graph totals
    if (!graphStatsLoading && graphStats) {
      parts.push(`${graphStats.nodeCount.toLocaleString()} entities`)
      parts.push(`${graphStats.edgeCount.toLocaleString()} relationships`)
    }

    if (parts.length === 0) {
      return <span className="font-body" style={sty}>No activity yet today</span>
    }

    return <span className="font-body" style={sty}>{parts.join(' · ')}</span>
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
