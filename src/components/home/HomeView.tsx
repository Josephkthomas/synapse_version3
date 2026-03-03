import { useState, useEffect, useCallback, useRef } from 'react'
import { Layers, GripVertical } from 'lucide-react'
import { GreetingHeader } from './GreetingHeader'
import { ConnectionDiscoveryCard } from './ConnectionDiscoveryCard'
import { FeedTab } from './FeedTab'
import { HomeFeedDetail } from './HomeFeedDetail'
import { useDailyStats } from '../../hooks/useDailyStats'
import { useActivityFeed } from '../../hooks/useActivityFeed'
import { useRecentCrossConnection } from '../../hooks/useCrossConnections'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { getGraphStats } from '../../services/supabase'
import type { FeedItem } from '../../types/feed'

const DEFAULT_LEFT_PCT = 66.67
const DETAIL_LEFT_PCT = 50
const MIN_LEFT_PCT = 20
const MAX_LEFT_PCT = 80

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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {items.map(item => (
        <div
          key={item.label}
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '16px 20px',
            textAlign: 'center',
          }}
        >
          {loading ? (
            <div
              className="rounded animate-pulse mx-auto"
              style={{ width: 40, height: 28, background: 'var(--color-bg-inset)' }}
            />
          ) : (
            <div
              className="font-display"
              style={{
                fontSize: 28,
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

function HomeEmptyDetail() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ padding: '0 32px', textAlign: 'center' }}
    >
      <Layers size={32} style={{ color: 'var(--color-text-placeholder)', marginBottom: 12 }} />
      <p
        className="font-body font-semibold"
        style={{ fontSize: 14, color: 'var(--color-text-body)', marginBottom: 4 }}
      >
        Select a source to explore
      </p>
      <p
        className="font-body"
        style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 280 }}
      >
        Click any feed card or "Explore More" to see its full details, entities, and connections here.
      </p>
    </div>
  )
}

export function HomeView() {
  const [graphStats, setGraphStats] = useState<GraphStatsData | null>(null)
  const [graphStatsLoading, setGraphStatsLoading] = useState(true)
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null)

  // Resizable two-column layout
  const [leftWidthPct, setLeftWidthPct] = useState(DEFAULT_LEFT_PCT)
  const [isDragging, setIsDragging] = useState(false)
  const [isHandleHovered, setIsHandleHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartPct = useRef(DEFAULT_LEFT_PCT)

  const { user } = useAuth()
  const { anchors } = useSettings()
  const { stats, loading: statsLoading, error: statsError } = useDailyStats()
  const { items: feedItems, loading: feedLoading, error: feedError, hasMore, loadMore, refetch } =
    useActivityFeed()
  const { connection: recentConnection } = useRecentCrossConnection(feedItems)

  useEffect(() => {
    if (!user) return
    setGraphStatsLoading(true)
    getGraphStats(user.id)
      .then(s => setGraphStats({ nodeCount: s.nodeCount, edgeCount: s.edgeCount, sourceCount: s.sourceCount }))
      .catch(() => {})
      .finally(() => setGraphStatsLoading(false))
  }, [user])

  // Keep selectedFeedItem in sync with fresher feed data
  useEffect(() => {
    if (!selectedFeedItem || feedItems.length === 0) return
    const refreshed = feedItems.find(i => i.source.id === selectedFeedItem.source.id)
    if (refreshed && refreshed !== selectedFeedItem) setSelectedFeedItem(refreshed)
  }, [feedItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag-to-resize ──────────────────────────────────────────────────────────

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartPct.current = leftWidthPct
    setIsDragging(true)

    const onMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.offsetWidth
      const delta = ev.clientX - dragStartX.current
      const deltaPct = (delta / containerWidth) * 100
      setLeftWidthPct(Math.max(MIN_LEFT_PCT, Math.min(MAX_LEFT_PCT, dragStartPct.current + deltaPct)))
    }

    const onMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [leftWidthPct])

  // Snap right column open when detail is requested
  const openRightDetail = useCallback(() => {
    if (leftWidthPct >= DEFAULT_LEFT_PCT - 2) {
      setLeftWidthPct(DETAIL_LEFT_PCT)
    }
  }, [leftWidthPct])

  // ── Item selection ───────────────────────────────────────────────────────────

  const handleItemSelect = useCallback((item: FeedItem) => {
    setSelectedFeedItem(item)
    openRightDetail()
  }, [openRightDetail])

  // ── Right column content ─────────────────────────────────────────────────────

  const rightContent = (() => {
    if (selectedFeedItem) {
      return (
        <HomeFeedDetail
          item={selectedFeedItem}
          onClose={() => setSelectedFeedItem(null)}
          onSourceSelect={(sourceId) => {
            const found = feedItems.find(i => i.source.id === sourceId)
            if (found) handleItemSelect(found)
          }}
        />
      )
    }
    return <HomeEmptyDetail />
  })()

  return (
    <div className="flex flex-col h-full">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Control bar — full width with greeting + stats ── */}
      <div
        className="flex items-center shrink-0"
        style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '8px 24px',
          minHeight: 44,
          gap: 16,
        }}
      >
        <GreetingHeader
          stats={stats}
          loading={statsLoading}
          error={statsError}
        />
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
        style={{
          background: 'var(--color-bg-content)',
          userSelect: isDragging ? 'none' : undefined,
          cursor: isDragging ? 'col-resize' : undefined,
        }}
      >
        {/* ── Left: scrollable feed list ── */}
        <div
          className="h-full overflow-y-auto flex-shrink-0"
          style={{
            width: `${leftWidthPct}%`,
            borderRight: 'none',
            padding: '20px 36px',
            transition: isDragging ? 'none' : 'width 0.2s ease',
          }}
        >
          <QuickStatsRow
            stats={graphStats}
            anchorCount={anchors.length}
            loading={graphStatsLoading}
          />

          {!feedLoading && recentConnection && (
            <ConnectionDiscoveryCard connection={recentConnection} />
          )}

          <FeedTab
            items={feedItems}
            loading={feedLoading}
            error={feedError}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRetry={refetch}
            selectedSourceId={selectedFeedItem?.source.id ?? null}
            onItemSelect={handleItemSelect}
          />
        </div>

        {/* ── Resize handle ── */}
        <div
          className="resize-handle flex-shrink-0 flex items-center justify-center"
          onMouseDown={handleDividerMouseDown}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
          style={{
            width: 16,
            cursor: 'col-resize',
            position: 'relative',
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          {/* Thin divider line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 0,
            bottom: 0,
            width: 2,
            background: (isDragging || isHandleHovered) ? 'var(--color-accent-500)' : 'var(--border-subtle)',
            transition: 'background 0.15s ease',
            borderRadius: 1,
          }} />
          {/* Grip icon */}
          <GripVertical
            size={14}
            style={{
              position: 'relative',
              zIndex: 1,
              color: (isDragging || isHandleHovered) ? 'var(--color-accent-500)' : 'var(--color-text-placeholder)',
              transition: 'color 0.15s ease',
              background: 'var(--color-bg-content)',
              borderRadius: 2,
            }}
          />
        </div>

        {/* ── Right: source detail ── */}
        <div
          className="flex-1 h-full overflow-y-auto"
          style={{ background: 'var(--color-bg-content)', minWidth: 0 }}
        >
          {rightContent}
        </div>

      </div>
    </div>
  )
}
