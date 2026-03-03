import { useState, useCallback, useRef, useMemo } from 'react'
import { Plus, GripVertical, Navigation } from 'lucide-react'
import { useDigestProfiles } from '../hooks/useDigestProfiles'
import { useAuth } from '../hooks/useAuth'
import { DigestCard } from '../components/orient/DigestCard'
import { DigestDetail } from '../components/orient/DigestDetail'
import { DigestProfileEditor } from '../components/settings/DigestProfileEditor'
import { DigestViewer } from '../components/home/DigestViewer'
import { saveDigestHistory, supabase } from '../services/supabase'
import { generateDigest } from '../services/digestEngine'
import type { DigestProfile } from '../types/feed'
import type { DigestHistoryEntry, DigestOutput } from '../types/digest'

type FilterType = 'all' | 'daily' | 'weekly' | 'monthly'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Digests' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

const FREQUENCY_ORDER: DigestProfile['frequency'][] = ['daily', 'weekly', 'monthly']
const FREQUENCY_LABELS: Record<DigestProfile['frequency'], string> = {
  daily: 'Daily Digests',
  weekly: 'Weekly Digests',
  monthly: 'Monthly Digests',
}

const DEFAULT_LEFT_PCT = 64
const MIN_LEFT_PCT = 30
const MAX_LEFT_PCT = 80

function SL({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-display font-bold uppercase"
      style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginBottom: 10 }}
    >
      {children}
    </div>
  )
}

export function OrientView() {
  const { profiles, loading, error, tableExists, refresh: refreshProfiles, remove } = useDigestProfiles()
  const { user } = useAuth()

  // Selection + filter
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  // Editor state
  const [showEditor, setShowEditor] = useState(false)
  const [editingProfile, setEditingProfile] = useState<DigestProfile | null>(null)

  // Viewer modal state (transplanted from HomeView)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerProfile, setViewerProfile] = useState<DigestProfile | null>(null)
  const [viewerEntry, setViewerEntry] = useState<DigestHistoryEntry | null>(null)
  const [viewerOutput, setViewerOutput] = useState<DigestOutput | null>(null)
  const [generatingProfileId, setGeneratingProfileId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; name: string } | null>(null)

  // Ready profile tracking
  const [readyProfileIds, setReadyProfileIds] = useState<Set<string>>(new Set())

  // Two-column layout
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidthPct, setLeftWidthPct] = useState(DEFAULT_LEFT_PCT)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartPct = useRef(DEFAULT_LEFT_PCT)

  // ── Computed values ───────────────────────────────────────────────────────

  const enrichedProfiles = useMemo(
    () => profiles.map(p => ({
      ...p,
      status: readyProfileIds.has(p.id) ? ('ready' as const) : p.status,
    })),
    [profiles, readyProfileIds]
  )

  const filteredProfiles = useMemo(() =>
    filter === 'all' ? enrichedProfiles : enrichedProfiles.filter(p => p.frequency === filter),
    [enrichedProfiles, filter]
  )

  const groupedProfiles = useMemo(() => {
    if (filter !== 'all') {
      return [{ frequency: filter as DigestProfile['frequency'], profs: filteredProfiles }]
    }
    return FREQUENCY_ORDER
      .map(freq => ({ frequency: freq, profs: enrichedProfiles.filter(p => p.frequency === freq) }))
      .filter(g => g.profs.length > 0)
  }, [filter, enrichedProfiles, filteredProfiles])

  const activeCount = enrichedProfiles.filter(p => p.isActive).length
  const selectedProfile = selectedProfileId ? enrichedProfiles.find(p => p.id === selectedProfileId) ?? null : null

  const filterCount = useCallback((key: FilterType) => {
    if (key === 'all') return enrichedProfiles.length
    return enrichedProfiles.filter(p => p.frequency === key).length
  }, [enrichedProfiles])

  // ── Drag resize ───────────────────────────────────────────────────────────

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartPct.current = leftWidthPct
    setIsDragging(true)

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const containerW = containerRef.current.getBoundingClientRect().width
      const delta = ev.clientX - dragStartX.current
      const deltaPct = (delta / containerW) * 100
      setLeftWidthPct(Math.min(MAX_LEFT_PCT, Math.max(MIN_LEFT_PCT, dragStartPct.current + deltaPct)))
    }
    const onUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [leftWidthPct])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCardClick = (id: string) => {
    if (showEditor) {
      setShowEditor(false)
      setEditingProfile(null)
    }
    setSelectedProfileId(prev => prev === id ? null : id)
  }

  const handleNewDigest = () => {
    setSelectedProfileId(null)
    setEditingProfile(null)
    setShowEditor(true)
  }

  const handleEditProfile = (profile: DigestProfile) => {
    setSelectedProfileId(null)
    setEditingProfile(profile)
    setShowEditor(true)
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingProfile(null)
  }

  const handleEditorSaved = (id: string) => {
    setShowEditor(false)
    setEditingProfile(null)
    refreshProfiles()
    setSelectedProfileId(id)
  }

  const handleToggleActive = useCallback(async (profile: DigestProfile) => {
    const newActive = !profile.isActive
    // Direct supabase update to toggle is_active without replacing modules
    await supabase
      .from('digest_profiles')
      .update({ is_active: newActive, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    refreshProfiles()
  }, [refreshProfiles])

  const handleDeleteProfile = useCallback(async (id: string) => {
    await remove(id)
    setSelectedProfileId(null)
  }, [remove])

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
        // Non-critical — generation still succeeded
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

  // ── Render ────────────────────────────────────────────────────────────────

  const showCreatePanel = showEditor && !editingProfile
  const isEditorOpen = showEditor

  return (
    <div className="flex flex-col h-full">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Control bar — full width above split ── */}
      <div
        className="flex items-center shrink-0 flex-wrap"
        style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '8px 24px',
          minHeight: 44,
          gap: 8,
        }}
      >
        {/* Filter pills */}
        {FILTERS.map(f => {
          const isActive = filter === f.key
          const count = filterCount(f.key)
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="font-body font-semibold"
              style={{
                padding: '5px 13px',
                borderRadius: 20,
                fontSize: 12,
                border: isActive ? '1px solid rgba(214,58,0,0.15)' : '1px solid var(--border-subtle)',
                background: isActive ? 'var(--color-accent-50)' : 'transparent',
                color: isActive ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {f.label}
              <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.6 }}>({count})</span>
            </button>
          )
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', flexShrink: 0 }} />

        {/* Stats strip */}
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span className="font-display" style={{ fontWeight: 700, color: activeCount > 0 ? '#22c55e' : 'var(--color-text-primary)' }}>
            {activeCount}
          </span>{' '}
          active
        </span>
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {filterCount('daily')} daily
        </span>
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {filterCount('weekly')} weekly
        </span>

        <div className="flex-1" />

        {/* New Digest button */}
        <button
          type="button"
          onClick={handleNewDigest}
          className="font-body font-semibold"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            border: showCreatePanel
              ? '1px solid rgba(214,58,0,0.3)'
              : 'none',
            background: showCreatePanel
              ? 'var(--color-accent-50)'
              : 'var(--color-accent-500)',
            color: showCreatePanel
              ? 'var(--color-accent-500)'
              : 'white',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <Plus size={14} />
          New Digest
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
        style={{
          userSelect: isDragging ? 'none' : undefined,
          cursor: isDragging ? 'col-resize' : undefined,
        }}
      >
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div
          style={{
            width: `${leftWidthPct}%`,
            transition: isDragging ? 'none' : 'width 0.2s ease',
            height: '100%',
            overflowY: 'auto',
            background: 'var(--color-bg-content)',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '20px 36px' }}>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: 16 }}>
                <p className="font-body" style={{ fontSize: 12, color: '#ef4444' }}>
                  Couldn't load your digests. Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={refreshProfiles}
                  className="font-body"
                  style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && profiles.length === 0 && (
              <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '40px 0', textAlign: 'center' }}>
                Loading digests...
              </p>
            )}

            {/* Empty state */}
            {!loading && !error && !tableExists && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Navigation size={36} style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 14px', display: 'block' }} />
                <h2 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                  No digests configured yet
                </h2>
                <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 300, margin: '0 auto' }}>
                  Use the panel on the right to create your first intelligence briefing. Digests draw from your knowledge graph on a schedule.
                </p>
              </div>
            )}

            {!loading && !error && tableExists && enrichedProfiles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Navigation size={36} style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 14px', display: 'block' }} />
                <h2 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                  No digests configured yet
                </h2>
                <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 300, margin: '0 auto' }}>
                  Use the panel on the right to create your first intelligence briefing. Digests draw from your knowledge graph on a schedule.
                </p>
              </div>
            )}

            {/* Grouped digest cards */}
            {groupedProfiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {groupedProfiles.map(({ frequency, profs }) => (
                  <div key={frequency}>
                    {filter === 'all' && <SL>{FREQUENCY_LABELS[frequency]}</SL>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {profs.map((profile, index) => (
                        <DigestCard
                          key={profile.id}
                          profile={profile}
                          isSelected={selectedProfileId === profile.id}
                          onClick={() => handleCardClick(profile.id)}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom create reminder */}
            {!loading && enrichedProfiles.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={handleNewDigest}
                  style={{
                    padding: '14px 22px',
                    borderRadius: 12,
                    border: '2px dashed var(--border-default)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    background: 'transparent',
                    width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(214,58,0,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
                >
                  <Plus size={16} style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 4px', display: 'block' }} />
                  <div className="font-body" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Create Another Digest
                  </div>
                  <div className="font-body" style={{ fontSize: 11, color: 'var(--color-text-placeholder)', marginTop: 2 }}>
                    Intelligence briefings from your knowledge graph
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Drag handle ────────────────────────────────────────────────── */}
        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            width: 12,
            height: '100%',
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-content)',
            borderLeft: '1px solid var(--border-subtle)',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <GripVertical size={14} style={{ color: 'var(--color-text-placeholder)', pointerEvents: 'none' }} />
        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0 }}>
          {selectedProfile && !isEditorOpen
            ? (
              <DigestDetail
                profile={selectedProfile}
                onClose={() => setSelectedProfileId(null)}
                onEdit={() => handleEditProfile(selectedProfile)}
                onGenerateNow={() => handleGenerateNow(selectedProfile.id)}
                onDelete={() => handleDeleteProfile(selectedProfile.id)}
                onToggleActive={() => handleToggleActive(selectedProfile)}
                generating={generatingProfileId === selectedProfile.id}
              />
            )
            : (
              <DigestProfileEditor
                panel
                profile={editingProfile ?? undefined}
                onClose={handleEditorClose}
                onSaved={handleEditorSaved}
              />
            )
          }
        </div>
      </div>

      {/* Digest Viewer modal */}
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
    </div>
  )
}
