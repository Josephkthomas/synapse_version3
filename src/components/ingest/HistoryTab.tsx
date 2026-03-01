import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronDown, ArrowUpDown, RefreshCw } from 'lucide-react'
import { useExtractionHistory } from '../../hooks/useExtractionHistory'
import { FilterDrop } from '../shared/FilterDrop'
import { EntityBadge } from '../shared/EntityBadge'
import { getSourceConfig, SOURCE_TYPE_CONFIG } from '../../config/sourceTypes'
import { EXTRACTION_MODES, ANCHOR_EMPHASIS_LEVELS } from '../../config/extractionModes'
import { supabase } from '../../services/supabase'
import type { ExtractionSession } from '../../types/extraction'

interface HistoryTabProps {
  onReExtract?: (content: string, settings: {
    mode: string
    emphasis: string
    guidance: string | null
  }) => void
}

const SOURCE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  ...Object.entries(SOURCE_TYPE_CONFIG).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  })),
]

const STATUS_OPTIONS = [
  { value: 'all' as const, label: 'All Status' },
  { value: 'completed' as const, label: 'Completed' },
  { value: 'failed' as const, label: 'Failed' },
]

const SOURCE_ICON_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE_TYPE_CONFIG).map(([key, cfg]) => [key, cfg.icon])
)

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function HistoryTab({ onReExtract }: HistoryTabProps) {
  const navigate = useNavigate()
  const {
    sessions,
    totalCount,
    isLoading,
    filters,
    hasMore,
    setSourceTypeFilter,
    setStatusFilter,
    toggleSort,
    loadMore,
  } = useExtractionHistory()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sourceFilterOpen, setSourceFilterOpen] = useState(false)
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)

  const handleReExtract = useCallback(async (session: ExtractionSession) => {
    if (!onReExtract) return

    try {
      const { data: sources } = await supabase
        .from('knowledge_sources')
        .select('content')
        .ilike('title', session.source_name || '')
        .order('created_at', { ascending: false })
        .limit(1)

      const content = sources?.[0]?.content || session.source_content_preview || ''

      onReExtract(content, {
        mode: session.extraction_mode,
        emphasis: session.anchor_emphasis,
        guidance: session.user_guidance,
      })
    } catch (err) {
      console.warn('[HistoryTab] Failed to fetch source content:', err)
      onReExtract(session.source_content_preview || '', {
        mode: session.extraction_mode,
        emphasis: session.anchor_emphasis,
        guidance: session.user_guidance,
      })
    }
  }, [onReExtract])

  const getModeConfig = (modeId: string) =>
    EXTRACTION_MODES.find(m => m.id === modeId)

  const getEmphasisLabel = (emphasisId: string) =>
    ANCHOR_EMPHASIS_LEVELS.find(e => e.id === emphasisId)?.label ?? emphasisId

  // Loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Loading extraction history...
        </p>
      </div>
    )
  }

  // Empty state
  if (!isLoading && sessions.length === 0 && filters.sourceType === 'all' && filters.status === 'all') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <History
          size={40}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 12px' }}
        />
        <p
          className="font-body font-semibold"
          style={{ fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4 }}
        >
          No extractions yet
        </p>
        <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Start by capturing some knowledge from a document, meeting, or YouTube video.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 12 }}>
        <FilterDrop
          label="Source"
          options={SOURCE_TYPE_OPTIONS}
          selected={filters.sourceType === 'all' ? [] : [filters.sourceType]}
          onToggle={(value) => setSourceTypeFilter(
            value === filters.sourceType ? 'all' : value
          )}
          iconMap={SOURCE_ICON_MAP}
          isOpen={sourceFilterOpen}
          onOpenChange={setSourceFilterOpen}
        />

        <FilterDrop
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.status === 'all' ? [] : [filters.status]}
          onToggle={(value) => setStatusFilter(
            value === filters.status ? 'all' : value as 'all' | 'completed' | 'failed'
          )}
          isOpen={statusFilterOpen}
          onOpenChange={setStatusFilterOpen}
        />

        <button
          type="button"
          onClick={toggleSort}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-body cursor-pointer"
          style={{
            fontSize: 12,
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowUpDown size={12} />
          {filters.sortAsc ? 'Oldest' : 'Newest'}
        </button>

        <span
          className="font-body"
          style={{ fontSize: 11, color: 'var(--color-text-placeholder)', marginLeft: 'auto' }}
        >
          {totalCount} extraction{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* No results with filters */}
      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            No extractions match the current filters.
          </p>
        </div>
      )}

      {/* Session List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sessions.map(session => {
          const config = getSourceConfig(session.source_type)
          const isExpanded = expandedId === session.id
          const modeConfig = getModeConfig(session.extraction_mode)

          return (
            <div key={session.id}>
              {/* Collapsed Row */}
              <div
                className="flex items-center justify-between cursor-pointer"
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  transition: 'background 0.15s ease',
                  background: isExpanded ? 'var(--color-bg-hover)' : 'transparent',
                }}
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                onMouseEnter={e => {
                  if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {/* Left: Info */}
                <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{config.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="font-body font-semibold"
                      style={{
                        fontSize: 13,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {session.source_name || 'Untitled'}
                    </div>
                    <div
                      className="font-body"
                      style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
                    >
                      {formatTimestamp(session.created_at)}
                    </div>
                  </div>
                </div>

                {/* Right: Stats + Chevron */}
                <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                  <span
                    className="font-body"
                    style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
                  >
                    {session.entity_count} entities · {session.relationship_count} rels
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: 'var(--color-text-placeholder)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div
                  style={{
                    padding: '12px 16px 16px 44px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Metadata Row */}
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10 }}>
                    {/* Mode Badge */}
                    {modeConfig && (
                      <span
                        className="font-body font-semibold"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 5,
                          color: modeConfig.colorHex,
                          background: `${modeConfig.colorHex}12`,
                          border: `1px solid ${modeConfig.colorHex}29`,
                        }}
                      >
                        {modeConfig.label}
                      </span>
                    )}

                    {/* Emphasis */}
                    <span
                      className="font-body"
                      style={{
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 5,
                        color: 'var(--color-text-secondary)',
                        background: 'var(--color-bg-inset)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {getEmphasisLabel(session.anchor_emphasis)} emphasis
                    </span>

                    {/* Duration */}
                    <span
                      className="font-body"
                      style={{ fontSize: 10, color: 'var(--color-text-placeholder)' }}
                    >
                      {formatDuration(session.extraction_duration_ms)}
                    </span>
                  </div>

                  {/* Anchor IDs (if any) */}
                  {session.selected_anchor_ids && session.selected_anchor_ids.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 10 }}>
                      <span
                        className="font-body"
                        style={{ fontSize: 10, color: 'var(--color-text-placeholder)' }}
                      >
                        Anchors:
                      </span>
                      {session.selected_anchor_ids.map(anchorId => (
                        <span
                          key={anchorId}
                          className="font-body"
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            color: '#b45309',
                            background: 'rgba(180,83,9,0.08)',
                            border: '1px solid rgba(180,83,9,0.16)',
                          }}
                        >
                          {anchorId.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Entity Badges (sample from source_content_preview — we show entity_count) */}
                  {session.entity_count > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 12 }}>
                      <EntityBadge type={config.label} label={`${session.entity_count} entities`} size="xs" />
                      <EntityBadge type="Relationship" label={`${session.relationship_count} relationships`} size="xs" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/explore')
                      }}
                      className="font-body font-semibold cursor-pointer"
                      style={{
                        fontSize: 11,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'var(--color-bg-inset)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--color-text-body)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      View in Browse
                    </button>

                    {onReExtract && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReExtract(session)
                        }}
                        className="font-body font-semibold cursor-pointer flex items-center gap-1"
                        style={{
                          fontSize: 11,
                          padding: '6px 12px',
                          borderRadius: 6,
                          background: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--color-accent-500)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <RefreshCw size={10} />
                        Re-extract
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-accent-500)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            textAlign: 'center',
            width: '100%',
            marginTop: 8,
          }}
        >
          Load more
        </button>
      )}
    </div>
  )
}
