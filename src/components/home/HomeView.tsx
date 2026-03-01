import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Layers, GripVertical } from 'lucide-react'
import { GreetingHeader } from './GreetingHeader'
import { ConnectionDiscoveryCard } from './ConnectionDiscoveryCard'
import { FeedTab } from './FeedTab'
import { BriefingsTab } from './BriefingsTab'
import { DigestViewer } from './DigestViewer'
import { HomeFeedDetail } from './HomeFeedDetail'
import { DigestProfileEditor } from '../settings/DigestProfileEditor'
import { ToggleGroup } from '../shared/ToggleGroup'
import { useDailyStats } from '../../hooks/useDailyStats'
import { useActivityFeed } from '../../hooks/useActivityFeed'
import { useDigestProfiles } from '../../hooks/useDigestProfiles'
import { useRecentCrossConnection } from '../../hooks/useCrossConnections'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { getGraphStats, fetchDigestHistory, saveDigestHistory } from '../../services/supabase'
import { generateDigest } from '../../services/digestEngine'
import type { DigestProfile, FeedItem } from '../../types/feed'
import type { DigestHistoryEntry, DigestOutput } from '../../types/digest'

type ActiveTab = 'feed' | 'briefings'

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('feed')
  const [graphStats, setGraphStats] = useState<GraphStatsData | null>(null)
  const [graphStatsLoading, setGraphStatsLoading] = useState(true)
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null)

  // Digest editor (inline in right column)
  const [showDigestEditor, setShowDigestEditor] = useState(false)
  const [editingProfile, setEditingProfile] = useState<DigestProfile | null>(null)

  // Digest viewer (modal — for viewing a generated digest)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerProfile, setViewerProfile] = useState<DigestProfile | null>(null)
  const [viewerEntry, setViewerEntry] = useState<DigestHistoryEntry | null>(null)
  const [viewerOutput, setViewerOutput] = useState<DigestOutput | null>(null)
  const [generatingProfileId, setGeneratingProfileId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; name: string } | null>(null)

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
  const { profiles, loading: profilesLoading, tableExists, refresh: refreshProfiles } = useDigestProfiles()
  const { connection: recentConnection } = useRecentCrossConnection(feedItems)

  const [readyProfileIds, setReadyProfileIds] = useState<Set<string>>(new Set())

  const enrichedProfiles = useMemo(
    () => profiles.map(p => ({
      ...p,
      status: readyProfileIds.has(p.id) ? ('ready' as const) : p.status,
    })),
    [profiles, readyProfileIds]
  )

  const readyCount = useMemo(
    () => enrichedProfiles.filter(p => p.status === 'ready').length,
    [enrichedProfiles]
  )

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
    setShowDigestEditor(false)
    setEditingProfile(null)
    openRightDetail()
  }, [openRightDetail])

  // ── Digest editor ────────────────────────────────────────────────────────────

  const openDigestEditor = useCallback((profile: DigestProfile | null) => {
    setEditingProfile(profile)
    setShowDigestEditor(true)
    setSelectedFeedItem(null)
    openRightDetail()
  }, [openRightDetail])

  const closeDigestEditor = useCallback(() => {
    setShowDigestEditor(false)
    setEditingProfile(null)
  }, [])

  // ── Digest viewer (modal) ────────────────────────────────────────────────────

  const handleViewProfile = useCallback(async (profileId: string) => {
    const profile = enrichedProfiles.find(p => p.id === profileId)
    if (!profile || !user) return
    try {
      const history = await fetchDigestHistory(profileId, 1)
      setViewerProfile(profile)
      setViewerEntry(history[0] ?? null)
      setViewerOutput(null)
      setViewerOpen(true)
    } catch {
      setViewerProfile(profile)
      setViewerEntry(null)
      setViewerOutput(null)
      setViewerOpen(true)
    }
  }, [enrichedProfiles, user])

  const handleGenerateNow = useCallback(async (profileId: string) => {
    const profile = enrichedProfiles.find(p => p.id === profileId)
    if (!profile || !user) return

    setViewerProfile(profile)
    setViewerEntry(null)
    setViewerOutput(null)
    setGeneratingProfileId(profileId)
    setGenerationProgress(null)
    setViewerOpen(true)

    try {
      const output = await generateDigest(profile, user.id, {
        onModuleProgress: (current, total, name) => {
          setGenerationProgress({ current, total, name })
        },
      })
      setViewerOutput(output)
      try {
        await saveDigestHistory({
          digest_profile_id: profile.id,
          user_id: user.id,
          generated_at: output.generatedAt,
          content: output,
          module_outputs: output.modules,
          executive_summary: output.executiveSummary,
          density: profile.density,
          generation_duration_ms: output.totalDurationMs,
          status: 'generated',
          delivery_results: [],
        })
        setReadyProfileIds(prev => new Set([...prev, profile.id]))
        refreshProfiles()
      } catch {
        // Non-critical
      }
    } catch (err) {
      console.warn('Digest generation failed:', err)
    } finally {
      setGeneratingProfileId(null)
    }
  }, [enrichedProfiles, user, refreshProfiles])

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false)
    setViewerProfile(null)
    setViewerEntry(null)
    setViewerOutput(null)
    setGenerationProgress(null)
  }, [])

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

  // ── Right column content ─────────────────────────────────────────────────────

  const rightContent = (() => {
    if (showDigestEditor) {
      return (
        <DigestProfileEditor
          panel
          profile={editingProfile ?? undefined}
          onClose={closeDigestEditor}
          onSaved={(_id) => { closeDigestEditor(); refreshProfiles() }}
        />
      )
    }
    if (selectedFeedItem) {
      return (
        <HomeFeedDetail
          item={selectedFeedItem}
          onClose={() => setSelectedFeedItem(null)}
        />
      )
    }
    return <HomeEmptyDetail />
  })()

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        ref={containerRef}
        className="flex h-full overflow-hidden"
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
            padding: '28px 24px',
            transition: isDragging ? 'none' : 'width 0.2s ease',
          }}
        >
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

          <ToggleGroup
            options={tabOptions}
            value={activeTab}
            onChange={setActiveTab}
            style={{ marginBottom: 16 }}
          />

          {activeTab === 'feed' && (
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
          )}
          {activeTab === 'briefings' && (
            <BriefingsTab
              profiles={enrichedProfiles}
              loading={profilesLoading}
              tableExists={tableExists}
              generatingProfileId={generatingProfileId}
              onCreateNew={() => openDigestEditor(null)}
              onViewProfile={handleViewProfile}
              onEditProfile={(profileId) => {
                const profile = enrichedProfiles.find(p => p.id === profileId) ?? null
                openDigestEditor(profile)
              }}
              onGenerateNow={handleGenerateNow}
            />
          )}
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

      {/* Digest Viewer (modal — for reading generated output) */}
      {viewerOpen && viewerProfile && (
        <DigestViewer
          profile={viewerProfile}
          entry={viewerEntry ?? undefined}
          output={viewerOutput ?? undefined}
          generating={generatingProfileId === viewerProfile.id}
          generationProgress={generationProgress ?? undefined}
          onClose={handleCloseViewer}
          onRegenerate={() => handleGenerateNow(viewerProfile.id)}
        />
      )}
    </>
  )
}
