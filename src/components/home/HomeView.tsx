import { useState, useMemo } from 'react'
import { GreetingHeader } from './GreetingHeader'
import { ConnectionDiscoveryCard } from './ConnectionDiscoveryCard'
import { FeedTab } from './FeedTab'
import { BriefingsTab } from './BriefingsTab'
import { useDailyStats } from '../../hooks/useDailyStats'
import { useActivityFeed } from '../../hooks/useActivityFeed'
import { useDigestProfiles } from '../../hooks/useDigestProfiles'
import { useRecentCrossConnection } from '../../hooks/useCrossConnections'

type ActiveTab = 'feed' | 'briefings'

export function HomeView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed')

  const { stats, loading: statsLoading, error: statsError } = useDailyStats()
  const { items: feedItems, loading: feedLoading, error: feedError, hasMore, loadMore, refetch } =
    useActivityFeed()
  const { profiles, loading: profilesLoading, tableExists } = useDigestProfiles()
  const { connection: recentConnection } = useRecentCrossConnection(feedItems)

  const readyCount = useMemo(
    () => profiles.filter(p => p.status === 'ready').length,
    [profiles]
  )

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="h-full overflow-y-auto" style={{ background: 'var(--color-bg-content)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto', padding: '28px 32px' }}>

          <GreetingHeader
            stats={stats}
            loading={statsLoading}
            error={statsError}
          />

          {!feedLoading && recentConnection && (
            <ConnectionDiscoveryCard connection={recentConnection} />
          )}

          {/* Feed / Briefings toggle group */}
          <div
            className="flex"
            style={{
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: 3,
              gap: 2,
              marginBottom: 20,
            }}
          >
            {(['feed', 'briefings'] as ActiveTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="flex-1 flex items-center justify-center font-body font-semibold cursor-pointer rounded-lg"
                style={{
                  fontSize: 12,
                  padding: '9px 0',
                  background: activeTab === tab ? 'var(--color-bg-card)' : 'transparent',
                  border: 'none',
                  color:
                    activeTab === tab
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                  boxShadow:
                    activeTab === tab ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                {tab === 'feed' ? 'Feed' : 'Briefings'}
                {tab === 'briefings' && readyCount > 0 && (
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
                )}
              </button>
            ))}
          </div>

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

        </div>
      </div>
    </>
  )
}
