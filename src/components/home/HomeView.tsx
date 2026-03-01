import { useState, useMemo, useEffect } from 'react'
import { GreetingHeader } from './GreetingHeader'
import { ConnectionDiscoveryCard } from './ConnectionDiscoveryCard'
import { FeedTab } from './FeedTab'
import { BriefingsTab } from './BriefingsTab'
import { ContentColumn } from '../layout/ContentColumn'
import { ToggleGroup } from '../shared/ToggleGroup'
import { useDailyStats } from '../../hooks/useDailyStats'
import { useActivityFeed } from '../../hooks/useActivityFeed'
import { useDigestProfiles } from '../../hooks/useDigestProfiles'
import { useRecentCrossConnection } from '../../hooks/useCrossConnections'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { getGraphStats } from '../../services/supabase'

type ActiveTab = 'feed' | 'briefings'

interface GraphStatsData {
  nodeCount: number
  edgeCount: number
  sourceCount: number
}

function QuickStatsRow({ stats, anchorCount, loading }: {
  stats: GraphStatsData | null
  anchorCount: number
  loading: boolean
}) {
  const items = [
    { label: 'Nodes', value: stats?.nodeCount ?? 0 },
    { label: 'Edges', value: stats?.edgeCount ?? 0 },
    { label: 'Sources', value: stats?.sourceCount ?? 0 },
    { label: 'Anchors', value: anchorCount },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
      {items.map(item => (
        <div
          key={item.label}
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          {loading ? (
            <div
              className="rounded animate-pulse mx-auto"
              style={{ width: 40, height: 22, background: 'var(--color-bg-inset)' }}
            />
          ) : (
            <div
              className="font-display"
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.03em',
              }}
            >
              {item.value.toLocaleString()}
            </div>
          )}
          <div
            className="font-body"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export function HomeView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed')
  const [graphStats, setGraphStats] = useState<GraphStatsData | null>(null)
  const [graphStatsLoading, setGraphStatsLoading] = useState(true)

  const { user } = useAuth()
  const { anchors } = useSettings()
  const { stats, loading: statsLoading, error: statsError } = useDailyStats()
  const { items: feedItems, loading: feedLoading, error: feedError, hasMore, loadMore, refetch } =
    useActivityFeed()
  const { profiles, loading: profilesLoading, tableExists } = useDigestProfiles()
  const { connection: recentConnection } = useRecentCrossConnection(feedItems)

  const readyCount = useMemo(
    () => profiles.filter(p => p.status === 'ready').length,
    [profiles]
  )

  useEffect(() => {
    if (!user) return
    setGraphStatsLoading(true)
    getGraphStats(user.id)
      .then(s => setGraphStats({ nodeCount: s.nodeCount, edgeCount: s.edgeCount, sourceCount: s.sourceCount }))
      .catch(() => {})
      .finally(() => setGraphStatsLoading(false))
  }, [user])

  const tabOptions: { key: ActiveTab; label: string; badge?: React.ReactNode }[] = [
    { key: 'feed', label: 'Feed' },
    {
      key: 'briefings',
      label: 'Briefings',
      badge: readyCount > 0 ? (
        <span
          className="font-body font-bold"
          style={{
            fontSize: 10,
            marginLeft: 6,
            padding: '1px 6px',
            borderRadius: 10,
            background: 'rgba(225,29,72,0.13)',
            color: '#e11d48',
          }}
        >
          {readyCount}
        </span>
      ) : undefined,
    },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <ContentColumn>
        <GreetingHeader
          stats={stats}
          loading={statsLoading}
          error={statsError}
        />

        <QuickStatsRow
          stats={graphStats}
          anchorCount={anchors.length}
          loading={graphStatsLoading}
        />

        {!feedLoading && recentConnection && (
          <ConnectionDiscoveryCard connection={recentConnection} />
        )}

        {/* Feed / Briefings toggle group */}
        <ToggleGroup
          options={tabOptions}
          value={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 20 }}
        />

        {/* Tab content */}
        {activeTab === 'feed' && (
          <FeedTab
            items={feedItems}
            loading={feedLoading}
            error={feedError}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRetry={refetch}
          />
        )}
        {activeTab === 'briefings' && (
          <BriefingsTab
            profiles={profiles}
            loading={profilesLoading}
            tableExists={tableExists}
          />
        )}
      </ContentColumn>
    </>
  )
}
