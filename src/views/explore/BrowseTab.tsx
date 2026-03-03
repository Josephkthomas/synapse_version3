import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Database, SearchX, AlertCircle, RefreshCw } from 'lucide-react'
import { FilterDrop } from '../../components/shared/FilterDrop'
import { ConfidenceSlider } from '../../components/shared/ConfidenceSlider'
import { FilterChips } from '../../components/shared/FilterChips'
import { BrowseTable } from './BrowseTable'
import { BrowseCards } from './BrowseCards'
import { useNodes } from '../../hooks/useNodes'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { useGraphContext } from '../../hooks/useGraphContext'
import { ENTITY_TYPE_COLORS } from '../../config/entityTypes'
import { fetchNodeById } from '../../services/supabase'
import type { FilterChip } from '../../components/shared/FilterChips'
import type { NodeWithMeta, NodeFilters, NodeNeighbor } from '../../types/nodes'

const SOURCE_EMOJI: Record<string, string> = {
  Meeting: '🎙',
  YouTube: '▶️',
  Research: '📖',
  Note: '📝',
  Document: '📄',
}

type DropdownId = 'entityType' | 'source' | 'anchor' | 'tag' | null

function SkeletonTable() {
  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '8px 0' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 animate-pulse"
          style={{ height: 48, borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="rounded" style={{ width: 200, height: 12, background: 'var(--color-bg-inset)' }} />
          <div className="rounded" style={{ width: 60, height: 10, background: 'var(--color-bg-inset)' }} />
          <div className="rounded flex-1" style={{ height: 10, background: 'var(--color-bg-inset)' }} />
          <div className="rounded" style={{ width: 40, height: 10, background: 'var(--color-bg-inset)' }} />
        </div>
      ))}
    </div>
  )
}

function SkeletonCards() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 8,
        maxWidth: 840,
        margin: '0 auto',
        padding: '16px 0',
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl" style={{ height: 160, background: 'var(--color-bg-inset)' }} />
      ))}
    </div>
  )
}

export interface BrowseTabProps {
  viewMode: 'table' | 'cards'
  onTotalCountChange: (count: number) => void
}

export function BrowseTab({ viewMode, onTotalCountChange }: BrowseTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string[]>([])
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string[]>([])
  const [anchorFilter, setAnchorFilter] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [confidenceMin, setConfidenceMin] = useState(0)
  const [debouncedConfidence, setDebouncedConfidence] = useState(0)
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null)
  const [animationKey, setAnimationKey] = useState(0)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confidenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { selectedNodeId, setSelectedNodeId, setRightPanelContent, addRecentNode } = useGraphContext()
  const { entityTypes, sourceTypes, tags, anchors } = useFilterOptions()

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setAnimationKey(k => k + 1)
    }, 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchQuery])

  // Debounce confidence
  useEffect(() => {
    if (confidenceTimerRef.current) clearTimeout(confidenceTimerRef.current)
    confidenceTimerRef.current = setTimeout(() => {
      setDebouncedConfidence(confidenceMin)
      setAnimationKey(k => k + 1)
    }, 200)
    return () => { if (confidenceTimerRef.current) clearTimeout(confidenceTimerRef.current) }
  }, [confidenceMin])

  const filters: NodeFilters = {
    search: debouncedSearch || undefined,
    entityTypes: entityTypeFilter.length > 0 ? entityTypeFilter : undefined,
    sourceTypes: sourceTypeFilter.length > 0 ? sourceTypeFilter : undefined,
    anchorIds: anchorFilter.length > 0 ? anchorFilter : undefined,
    tags: tagFilter.length > 0 ? tagFilter : undefined,
    minConfidence: debouncedConfidence > 0 ? debouncedConfidence / 100 : undefined,
  }

  const { nodes, totalCount, isLoading, error, page, setPage, refetch, maxConnections } = useNodes({ filters })

  // Notify parent of count changes for tab bar display
  useEffect(() => {
    onTotalCountChange(totalCount)
  }, [totalCount, onTotalCountChange])

  // Trigger re-animation on viewMode change
  useEffect(() => {
    setAnimationKey(k => k + 1)
  }, [viewMode])

  const hasFilters =
    entityTypeFilter.length > 0 || sourceTypeFilter.length > 0 ||
    anchorFilter.length > 0 || tagFilter.length > 0 ||
    debouncedConfidence > 0 || debouncedSearch.length > 0

  const handleToggle = useCallback((
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => (value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    setAnimationKey(k => k + 1)
  }, [])

  const handleClearAll = useCallback(() => {
    setSearchQuery(''); setDebouncedSearch('')
    setEntityTypeFilter([]); setSourceTypeFilter([])
    setAnchorFilter([]); setTagFilter([])
    setConfidenceMin(0); setDebouncedConfidence(0)
    setAnimationKey(k => k + 1)
  }, [])

  const chips: FilterChip[] = [
    ...entityTypeFilter.map(v => ({ id: `et-${v}`, label: v, type: 'entityType' as const, value: v })),
    ...sourceTypeFilter.map(v => ({ id: `st-${v}`, label: v, type: 'sourceType' as const, value: v })),
    ...anchorFilter.map(v => {
      const anchor = anchors.find(a => a.id === v)
      return { id: `an-${v}`, label: anchor?.label ?? v, type: 'anchor' as const, value: v }
    }),
    ...tagFilter.map(v => ({ id: `tg-${v}`, label: `#${v}`, type: 'tag' as const, value: v })),
    ...(debouncedConfidence > 0
      ? [{ id: 'conf', label: `Conf ≥ ${debouncedConfidence}%`, type: 'confidence' as const, value: String(debouncedConfidence) }]
      : []),
  ]

  const handleRemoveChip = useCallback((chip: FilterChip) => {
    if (chip.type === 'entityType') setEntityTypeFilter(prev => prev.filter(v => v !== chip.value))
    if (chip.type === 'sourceType') setSourceTypeFilter(prev => prev.filter(v => v !== chip.value))
    if (chip.type === 'anchor') setAnchorFilter(prev => prev.filter(v => v !== chip.value))
    if (chip.type === 'tag') setTagFilter(prev => prev.filter(v => v !== chip.value))
    if (chip.type === 'confidence') { setConfidenceMin(0); setDebouncedConfidence(0) }
    setAnimationKey(k => k + 1)
  }, [])

  const handleSelectNode = useCallback((node: NodeWithMeta) => {
    setSelectedNodeId(node.id)
    setRightPanelContent({ type: 'node', data: node })
    addRecentNode(node)
  }, [setSelectedNodeId, setRightPanelContent, addRecentNode])

  const handleNavigateToNeighbor = useCallback(async (neighbor: NodeNeighbor) => {
    try {
      const node = await fetchNodeById(neighbor.node.id)
      if (node) {
        setSelectedNodeId(node.id)
        setRightPanelContent({ type: 'node', data: node })
        addRecentNode(node)
      }
    } catch (err) {
      console.error('Navigation failed:', err)
    }
  }, [setSelectedNodeId, setRightPanelContent, addRecentNode])

  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const anchorOptions = anchors.map(a => ({ value: a.id, label: a.label }))
  const isNewUser = !isLoading && !error && totalCount === 0 && !hasFilters
  const isNoResults = !isLoading && !error && nodes.length === 0 && hasFilters

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2 shrink-0"
        style={{ padding: '10px 16px', background: 'var(--color-bg-card)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-2 flex-1"
          style={{ minWidth: 200, background: 'var(--color-bg-inset)', border: '1px solid var(--border-subtle)', padding: '6px 10px', borderRadius: 8 }}
        >
          <Search size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search entities…"
            className="flex-1 font-body text-[13px] bg-transparent border-none outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setDebouncedSearch('') }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <X size={12} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          )}
        </div>

        <FilterDrop label="Entity Types" options={entityTypes} selected={entityTypeFilter} onToggle={handleToggle(setEntityTypeFilter)} colorMap={ENTITY_TYPE_COLORS} iconMap={null} isOpen={openDropdown === 'entityType'} onOpenChange={open => setOpenDropdown(open ? 'entityType' : null)} />
        <FilterDrop label="Source Types" options={sourceTypes} selected={sourceTypeFilter} onToggle={handleToggle(setSourceTypeFilter)} colorMap={null} iconMap={SOURCE_EMOJI} isOpen={openDropdown === 'source'} onOpenChange={open => setOpenDropdown(open ? 'source' : null)} />
        <FilterDrop label="Anchors" options={anchorOptions} selected={anchorFilter} onToggle={handleToggle(setAnchorFilter)} colorMap={null} iconMap={null} isOpen={openDropdown === 'anchor'} onOpenChange={open => setOpenDropdown(open ? 'anchor' : null)} />
        <FilterDrop label="Tags" options={tags} selected={tagFilter} onToggle={handleToggle(setTagFilter)} colorMap={null} iconMap={null} isOpen={openDropdown === 'tag'} onOpenChange={open => setOpenDropdown(open ? 'tag' : null)} />
        <ConfidenceSlider value={confidenceMin} onChange={setConfidenceMin} />
      </div>

      {/* Active filter chips */}
      <FilterChips chips={chips} onRemove={handleRemoveChip} onClearAll={handleClearAll} />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 mx-4 mt-3 px-4 py-3" style={{ background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span className="font-body text-[13px] text-text-body flex-1">{error}</span>
          <button type="button" onClick={refetch} className="flex items-center gap-1 font-body text-[12px] font-semibold cursor-pointer px-2 py-1" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--color-text-secondary)', borderRadius: 6 }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 16px' }}>
        {isLoading && (viewMode === 'table' ? <SkeletonTable /> : <SkeletonCards />)}

        {isNewUser && (
          <div className="flex flex-col items-center justify-center py-20 text-center" style={{ maxWidth: 400, margin: '0 auto' }}>
            <Database size={48} style={{ color: 'var(--color-text-placeholder)', marginBottom: 16 }} />
            <h2 className="font-display font-bold text-text-primary mb-2" style={{ fontSize: '18px' }}>No entities yet</h2>
            <p className="font-body text-[13px] text-text-secondary leading-relaxed mb-6">
              Add your first source in the Ingest view to start building your knowledge graph.
            </p>
            <a href="/ingest" className="font-body text-[12px] font-semibold px-4 py-2" style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--color-text-secondary)', borderRadius: 8, textDecoration: 'none' }}>
              Go to Ingest
            </a>
          </div>
        )}

        {isNoResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center" style={{ maxWidth: 400, margin: '0 auto' }}>
            <SearchX size={40} style={{ color: 'var(--color-text-placeholder)', marginBottom: 16 }} />
            <h2 className="font-display font-bold text-text-primary mb-2" style={{ fontSize: '16px' }}>No matching entities</h2>
            <p className="font-body text-[13px] text-text-secondary leading-relaxed mb-6">Try adjusting your filters or search query.</p>
            <button type="button" onClick={handleClearAll} className="font-body text-[12px] font-semibold px-4 py-2 cursor-pointer" style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--color-text-secondary)', borderRadius: 8 }}>
              Clear all filters
            </button>
          </div>
        )}

        {!isLoading && !error && nodes.length > 0 && (
          <>
            {viewMode === 'table' ? (
              <BrowseTable
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                maxConnections={maxConnections}
                onSelectNode={handleSelectNode}
                onNavigateToNeighbor={handleNavigateToNeighbor}
                animationKey={animationKey}
              />
            ) : (
              <BrowseCards
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                animationKey={animationKey}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setPage(page - 1); setAnimationKey(k => k + 1) }}
                  disabled={page === 0}
                  className="font-body text-[12px] font-semibold cursor-pointer px-3 py-1.5"
                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--color-text-secondary)', borderRadius: 8, opacity: page === 0 ? 0.4 : 1 }}
                >
                  ← Previous
                </button>
                <span className="font-body text-[12px] text-text-secondary">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => { setPage(page + 1); setAnimationKey(k => k + 1) }}
                  disabled={page >= totalPages - 1}
                  className="font-body text-[12px] font-semibold cursor-pointer px-3 py-1.5"
                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--color-text-secondary)', borderRadius: 8, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-accent-500);
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-accent-500);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
