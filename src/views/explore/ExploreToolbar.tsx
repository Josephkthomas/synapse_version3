import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Eye, EyeOff, Anchor as AnchorIcon } from 'lucide-react'
import { ToggleGroup } from '../../components/shared/ToggleGroup'
import { getEntityColor, ENTITY_TYPE_COLORS } from '../../config/entityTypes'
import type { ExploreViewMode, ExploreFilters, ClusterData } from '../../types/explore'

interface ExploreToolbarProps {
  viewMode: ExploreViewMode
  onViewModeChange: (mode: ExploreViewMode) => void
  filters: ExploreFilters
  onToggleAnchor: (anchorId: string) => void
  onToggleSpotlight: (entityType: string | null) => void
  onRecencyChange: (recency: ExploreFilters['recency']) => void
  clusters: ClusterData[]
  // Neighborhood-specific
  isNeighborhood?: boolean
  showEdges?: boolean
  onToggleShowEdges?: () => void
}

const RECENCY_OPTIONS: { key: ExploreFilters['recency']; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All' },
]

// Entity types to show in spotlight dropdown
const SPOTLIGHT_TYPES = Object.keys(ENTITY_TYPE_COLORS).filter(t => t !== 'Anchor')

export function ExploreToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onToggleAnchor,
  onToggleSpotlight,
  onRecencyChange,
  clusters,
  isNeighborhood,
  showEdges,
  onToggleShowEdges,
}: ExploreToolbarProps) {
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const [anchorOpen, setAnchorOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  // Close spotlight dropdown on outside click
  useEffect(() => {
    if (!spotlightOpen) return
    const handler = (e: MouseEvent) => {
      if (spotlightRef.current && !spotlightRef.current.contains(e.target as Node)) {
        setSpotlightOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [spotlightOpen])

  // Close anchor dropdown on outside click
  useEffect(() => {
    if (!anchorOpen) return
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setAnchorOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorOpen])

  const activeAnchor = clusters.find(c => c.anchor.id === filters.activeAnchorId)

  return (
    <div
      className="flex items-center shrink-0 gap-3"
      style={{
        background: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 24px',
      }}
    >
      {/* 1. Prominent Entity / Sources toggle */}
      <div className="flex" style={{ borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
        <ViewModeButton
          label="Entities"
          active={viewMode === 'entities'}
          onClick={() => onViewModeChange('entities')}
        />
        <ViewModeButton
          label="Sources"
          active={viewMode === 'sources'}
          onClick={() => onViewModeChange('sources')}
        />
      </div>

      <Divider />

      {/* 2. Anchor dropdown (entities mode only) */}
      {viewMode === 'entities' && clusters.length > 0 && (
        <>
          <div ref={anchorRef} className="relative">
            <button
              type="button"
              onClick={() => setAnchorOpen(prev => !prev)}
              className="flex items-center gap-2 cursor-pointer font-body"
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 8,
                border: '1px solid',
                borderColor: activeAnchor
                  ? 'rgba(214,58,0,0.3)'
                  : 'var(--border-subtle)',
                background: activeAnchor
                  ? 'var(--color-accent-50)'
                  : 'transparent',
                color: activeAnchor
                  ? 'var(--color-accent-500)'
                  : 'var(--color-text-body)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <AnchorIcon size={13} style={{ flexShrink: 0 }} />
              {activeAnchor ? activeAnchor.anchor.label : 'Anchors'}
              <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
            </button>

            {anchorOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  padding: 6,
                  zIndex: 40,
                  minWidth: 200,
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                {/* Clear option */}
                {activeAnchor && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleAnchor(activeAnchor.anchor.id)
                      setAnchorOpen(false)
                    }}
                    className="flex items-center gap-2 w-full cursor-pointer font-body"
                    style={{
                      padding: '7px 10px',
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      background: 'none',
                      border: 'none',
                      borderRadius: 6,
                      textAlign: 'left',
                    }}
                  >
                    All anchors
                  </button>
                )}
                {clusters.map(c => (
                  <button
                    key={c.anchor.id}
                    type="button"
                    onClick={() => {
                      onToggleAnchor(c.anchor.id)
                      setAnchorOpen(false)
                    }}
                    className="flex items-center gap-2 w-full cursor-pointer font-body"
                    style={{
                      padding: '7px 10px',
                      fontSize: 11,
                      fontWeight: filters.activeAnchorId === c.anchor.id ? 600 : 400,
                      color: filters.activeAnchorId === c.anchor.id
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-body)',
                      background: filters.activeAnchorId === c.anchor.id
                        ? 'var(--color-bg-active)'
                        : 'none',
                      border: 'none',
                      borderRadius: 6,
                      textAlign: 'left',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: getEntityColor(c.anchor.entityType),
                        flexShrink: 0,
                      }}
                    />
                    <span className="flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.anchor.label}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: 'var(--color-text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {c.entityCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Divider />
        </>
      )}

      {/* 3. Entity Types dropdown (entities mode only) */}
      {viewMode === 'entities' && (
        <div ref={spotlightRef} className="relative">
          <button
            type="button"
            onClick={() => setSpotlightOpen(prev => !prev)}
            className="flex items-center gap-1.5 cursor-pointer font-body"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: filters.spotlightEntityType
                ? 'var(--color-accent-50)'
                : 'transparent',
              color: filters.spotlightEntityType
                ? 'var(--color-accent-500)'
                : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {filters.spotlightEntityType && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: getEntityColor(filters.spotlightEntityType),
                  flexShrink: 0,
                }}
              />
            )}
            {filters.spotlightEntityType || 'Entity Types'}
            <ChevronDown size={12} />
          </button>

          {spotlightOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--color-bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                padding: 6,
                zIndex: 40,
                minWidth: 160,
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {/* Clear option */}
              {filters.spotlightEntityType && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSpotlight(null)
                    setSpotlightOpen(false)
                  }}
                  className="flex items-center gap-2 w-full cursor-pointer font-body"
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    background: 'none',
                    border: 'none',
                    borderRadius: 6,
                    textAlign: 'left',
                  }}
                >
                  Clear filter
                </button>
              )}
              {SPOTLIGHT_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onToggleSpotlight(type)
                    setSpotlightOpen(false)
                  }}
                  className="flex items-center gap-2 w-full cursor-pointer font-body"
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: filters.spotlightEntityType === type ? 600 : 400,
                    color: filters.spotlightEntityType === type
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-body)',
                    background: filters.spotlightEntityType === type
                      ? 'var(--color-bg-active)'
                      : 'none',
                    border: 'none',
                    borderRadius: 6,
                    textAlign: 'left',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: getEntityColor(type),
                      flexShrink: 0,
                    }}
                  />
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show edges toggle (neighborhood only) */}
      {isNeighborhood && onToggleShowEdges && (
        <button
          type="button"
          onClick={onToggleShowEdges}
          className="flex items-center gap-1.5 cursor-pointer font-body"
          title={showEdges ? 'Hide edges' : 'Show edges'}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: showEdges ? 'var(--color-semantic-blue-50)' : 'transparent',
            color: showEdges ? 'var(--color-semantic-blue-700)' : 'var(--color-text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          {showEdges ? <Eye size={12} /> : <EyeOff size={12} />}
          Edges
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* 4. Right section: Recency */}
      <ToggleGroup
        options={RECENCY_OPTIONS}
        value={filters.recency}
        onChange={onRecencyChange}
        style={{ minWidth: 180 }}
      />
    </div>
  )
}

// ─── View Mode Button ────────────────────────────────────────────────────────

function ViewModeButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer font-display"
      style={{
        padding: '7px 20px',
        fontSize: 13,
        fontWeight: 700,
        border: 'none',
        background: active
          ? 'var(--color-accent-500)'
          : 'var(--color-bg-inset)',
        color: active
          ? '#ffffff'
          : 'var(--color-text-secondary)',
        transition: 'background 0.15s ease, color 0.15s ease',
        letterSpacing: '-0.01em',
      }}
    >
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: 'var(--border-subtle)',
        flexShrink: 0,
      }}
    />
  )
}
