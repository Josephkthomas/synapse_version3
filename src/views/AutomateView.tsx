import { useState, useCallback, useRef, useMemo } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { useAutomationSources } from '../hooks/useAutomationSources'
import { SourceCard } from '../components/automate/SourceCard'
import { SourceDetailPanel } from '../components/automate/SourceDetailPanel'
import { NewSourcePanel } from '../components/automate/NewSourcePanel'
import type { AutomationSource } from '../services/automationSources'

type FilterType = 'all' | 'youtube-playlist' | 'meeting'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Sources' },
  { key: 'meeting', label: 'Meeting Services' },
  { key: 'youtube-playlist', label: 'YouTube Playlists' },
]

// Ordered groups for "All" view: Meeting → Playlist
const CATEGORY_ORDER: AutomationSource['category'][] = ['meeting', 'youtube-playlist']
const CATEGORY_LABELS: Record<AutomationSource['category'], string> = {
  'meeting': 'Meeting Services',
  'youtube-playlist': 'YouTube Playlists',
}

// ─── Layout constants ────────────────────────────────────────────────────────
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

export function AutomateView() {
  const { sources, loading, error, refetch, queueSummary } = useAutomationSources()
  const [filter, setFilter] = useState<FilterType>('all')

  // null = right panel shows NewSourcePanel (default)
  // source.id = right panel shows SourceDetailPanel for that source
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  // ─── Drag resize — always active (2:1 is permanent) ─────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidthPct, setLeftWidthPct] = useState(DEFAULT_LEFT_PCT)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartPct = useRef(DEFAULT_LEFT_PCT)

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

  const filteredSources = useMemo(() => filter === 'all'
    ? sources
    : sources.filter(s => s.category === filter)
  , [sources, filter])

  const groupedSources = useMemo(() => {
    if (filter !== 'all') {
      return [{ category: filter as AutomationSource['category'], srcs: filteredSources }]
    }
    return CATEGORY_ORDER
      .map(cat => ({ category: cat, srcs: sources.filter(s => s.category === cat) }))
      .filter(g => g.srcs.length > 0)
  }, [filter, sources, filteredSources])

  const activeCount = sources.filter(s => s.status === 'active' || s.status === 'connected').length
  const selectedSource = selectedSourceId ? sources.find(s => s.id === selectedSourceId) ?? null : null

  const filterCount = useCallback((key: FilterType) => {
    if (key === 'all') return sources.length
    return sources.filter(s => s.category === key).length
  }, [sources])

  // After adding a source, show its detail in the right panel
  const handleSourceAdded = async (source: AutomationSource) => {
    await refetch()
    setSelectedSourceId(source.id)
  }

  // Click card → show detail; click same card again → back to NewSourcePanel
  const handleCardClick = (id: string) => {
    setSelectedSourceId(prev => prev === id ? null : id)
  }

  // "Connect Source" button → reset right panel to NewSourcePanel
  const handleConnectClick = () => setSelectedSourceId(null)

  return (
    <div className="flex flex-col h-full">
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
          <span className="font-display" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {activeCount}
          </span>{' '}
          active
        </span>
        {queueSummary.processing > 0 && (
          <span className="font-body" style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
            {queueSummary.processing} processing
          </span>
        )}
        {queueSummary.pending > 0 && (
          <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {queueSummary.pending} pending
          </span>
        )}
        {queueSummary.failed > 0 && (
          <span className="font-body" style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
            {queueSummary.failed} failed
          </span>
        )}

        <div className="flex-1" />

        {/* Connect Source button */}
        <button
          type="button"
          onClick={handleConnectClick}
          className="font-body font-semibold"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            border: selectedSourceId === null
              ? '1px solid rgba(214,58,0,0.3)'
              : 'none',
            background: selectedSourceId === null
              ? 'var(--color-accent-50)'
              : 'var(--color-accent-500)',
            color: selectedSourceId === null
              ? 'var(--color-accent-500)'
              : 'white',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          <Plus size={14} />
          Connect Source
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
        {/* ── Left column (2/3) ─────────────────────────────────────────────── */}
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

          {/* BackfillCard removed — backfill runs via cron now */}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && (
            <div style={{ marginBottom: 16 }}>
              <p className="font-body" style={{ fontSize: 12, color: '#ef4444' }}>
                Couldn't load your sources. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="font-body"
                style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {loading && sources.length === 0 && (
            <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '40px 0', textAlign: 'center' }}>
              Loading sources…
            </p>
          )}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {!loading && !error && sources.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>⚡</div>
              <h2 className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                No sources connected yet
              </h2>
              <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 280, margin: '0 auto' }}>
                Use the panel on the right to connect your first YouTube playlist or meeting service.
              </p>
            </div>
          )}

          {/* ── Grouped source cards ─────────────────────────────────────── */}
          {groupedSources.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {groupedSources.map(({ category, srcs }) => (
                <div key={category}>
                  {filter === 'all' && <SL>{CATEGORY_LABELS[category]}</SL>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {srcs.map((source, index) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        isSelected={selectedSourceId === source.id}
                        onClick={() => handleCardClick(source.id)}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Connect reminder at bottom ───────────────────────────────── */}
          {!loading && sources.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={handleConnectClick}
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
                  Connect a New Source
                </div>
                <div className="font-body" style={{ fontSize: 11, color: 'var(--color-text-placeholder)', marginTop: 2 }}>
                  YouTube playlist or meeting service
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Drag handle — always visible ─────────────────────────────────── */}
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

      {/* ── Right panel (1/3) — always visible ──────────────────────────── */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0 }}>
        {selectedSource
          ? (
            <SourceDetailPanel
              source={selectedSource}
              onClose={() => setSelectedSourceId(null)}
              onRefetch={refetch}
            />
          )
          : (
            <NewSourcePanel
              onSourceAdded={handleSourceAdded}
            />
          )
        }
      </div>
      </div>
    </div>
  )
}
