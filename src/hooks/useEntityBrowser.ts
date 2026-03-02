import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './useAuth'
import { fetchEntitiesWithConnectionCount } from '../services/exploreQueries'
import type { EntityWithConnections } from '../types/explore'

export type EntitySortOption = 'connections' | 'recent' | 'confidence' | 'alpha'

export type EntityBrowserState = ReturnType<typeof useEntityBrowser>

export function useEntityBrowser(enabled = true) {
  const { user } = useAuth()
  const [entities, setEntities] = useState<EntityWithConnections[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [srcFilter, setSrcFilter] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<EntitySortOption>('connections')
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Load data — only when enabled (i.e. entity-browser tab is active)
  useEffect(() => {
    if (!user || !enabled) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchEntitiesWithConnectionCount(user.id)
      .then(data => { if (!cancelled) setEntities(data) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, enabled])

  const toggleTypeFilter = useCallback((type: string) => {
    setTypeFilter(prev => prev.includes(type) ? prev.filter(v => v !== type) : [...prev, type])
  }, [])

  const toggleSrcFilter = useCallback((type: string) => {
    setSrcFilter(prev => prev.includes(type) ? prev.filter(v => v !== type) : [...prev, type])
  }, [])

  const toggleTagFilter = useCallback((tag: string) => {
    setTagFilter(prev => prev.includes(tag) ? prev.filter(v => v !== tag) : [...prev, tag])
  }, [])

  const clearAllFilters = useCallback(() => {
    setTypeFilter([])
    setSrcFilter([])
    setTagFilter([])
    setSearchQuery('')
  }, [])

  // Filtered + sorted entities
  const filteredEntities = useMemo(() => {
    let results = [...entities]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      results = results.filter(e =>
        e.label.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    if (typeFilter.length) results = results.filter(e => typeFilter.includes(e.entityType))
    if (srcFilter.length) results = results.filter(e => srcFilter.includes(e.sourceType ?? ''))
    if (tagFilter.length) results = results.filter(e => e.tags.some(t => tagFilter.includes(t)))

    switch (sortBy) {
      case 'connections': results.sort((a, b) => b.connectionCount - a.connectionCount); break
      case 'recent': results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'confidence': results.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)); break
      case 'alpha': results.sort((a, b) => a.label.localeCompare(b.label)); break
    }
    return results
  }, [entities, searchQuery, typeFilter, srcFilter, tagFilter, sortBy])

  const selectedEntity = useMemo(
    () => entities.find(e => e.id === selectedEntityId) ?? null,
    [entities, selectedEntityId]
  )

  const activeFilterCount = typeFilter.length + srcFilter.length + tagFilter.length + (searchQuery ? 1 : 0)

  const allTags = useMemo(
    () => [...new Set(entities.flatMap(e => e.tags))].sort(),
    [entities]
  )

  const allSourceTypes = useMemo(
    () => [...new Set(entities.map(e => e.sourceType).filter((s): s is string => !!s))].sort(),
    [entities]
  )

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredEntities.forEach(e => { counts[e.entityType] = (counts[e.entityType] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [filteredEntities])

  return {
    entities: filteredEntities,
    totalCount: entities.length,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    typeFilter,
    toggleTypeFilter,
    srcFilter,
    toggleSrcFilter,
    tagFilter,
    toggleTagFilter,
    sortBy,
    setSortBy,
    selectedEntity,
    selectedEntityId,
    setSelectedEntityId,
    activeFilterCount,
    clearAllFilters,
    allTags,
    allSourceTypes,
    typeDistribution,
    viewMode,
    setViewMode,
  }
}
