import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ExploreFilters, ExploreViewMode, ZoomLevel, ClusterData } from '../types/explore'

const DEFAULT_FILTERS: ExploreFilters = {
  searchQuery: '',
  activeAnchorId: null,
  spotlightEntityType: null,
  recency: 'all',
}

export function useExploreFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // View mode: entities | sources
  const [viewMode, setViewMode] = useState<ExploreViewMode>(
    (searchParams.get('mode') as ExploreViewMode) || 'entities'
  )

  // Zoom level
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(
    (searchParams.get('zoom') as ZoomLevel) || 'landscape'
  )

  // Active cluster (for neighborhood view)
  const [activeClusterId, setActiveClusterId] = useState<string | null>(
    searchParams.get('cluster') || null
  )

  // Show edges toggle (default on)
  const [showEdges, setShowEdges] = useState(true)

  // Selected entity ID
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    searchParams.get('node') || null
  )

  // Filters
  const [filters, setFilters] = useState<ExploreFilters>({
    ...DEFAULT_FILTERS,
    activeAnchorId: searchParams.get('anchor') || null,
    spotlightEntityType: searchParams.get('spotlight') || null,
    recency: (searchParams.get('recency') as ExploreFilters['recency']) || 'all',
  })

  // Debounced search
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, searchQuery: searchInput }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (viewMode !== 'entities') params.set('mode', viewMode)
    if (zoomLevel !== 'landscape') params.set('zoom', zoomLevel)
    if (activeClusterId) params.set('cluster', activeClusterId)
    if (selectedEntityId) params.set('node', selectedEntityId)
    if (filters.activeAnchorId) params.set('anchor', filters.activeAnchorId)
    if (filters.spotlightEntityType) params.set('spotlight', filters.spotlightEntityType)
    if (filters.recency !== 'all') params.set('recency', filters.recency)
    if (searchInput) params.set('q', searchInput)
    setSearchParams(params, { replace: true })
  }, [viewMode, zoomLevel, activeClusterId, selectedEntityId, filters.activeAnchorId, filters.spotlightEntityType, filters.recency, searchInput, setSearchParams])

  // Anchor toggle — click active anchor again to clear
  const toggleAnchor = useCallback((anchorId: string) => {
    setFilters(prev => ({
      ...prev,
      activeAnchorId: prev.activeAnchorId === anchorId ? null : anchorId,
      spotlightEntityType: null, // Clear spotlight when anchor selected
    }))
  }, [])

  // Spotlight toggle
  const toggleSpotlight = useCallback((entityType: string | null) => {
    setFilters(prev => ({
      ...prev,
      spotlightEntityType: prev.spotlightEntityType === entityType ? null : entityType,
      activeAnchorId: null, // Clear anchor when spotlight selected
    }))
  }, [])

  // Recency toggle
  const setRecency = useCallback((recency: ExploreFilters['recency']) => {
    setFilters(prev => ({ ...prev, recency }))
  }, [])

  // Enter neighborhood (click cluster)
  const enterNeighborhood = useCallback((clusterId: string) => {
    setActiveClusterId(clusterId)
    setZoomLevel('neighborhood')
    setSelectedEntityId(null)
  }, [])

  // Return to landscape
  const returnToLandscape = useCallback(() => {
    setActiveClusterId(null)
    setZoomLevel('landscape')
    setSelectedEntityId(null)
  }, [])

  // Cluster visibility: determines if a cluster should be dimmed or bright
  const isClusterVisible = useCallback((cluster: ClusterData): boolean => {
    // If no filters active, all visible
    if (!filters.activeAnchorId && !filters.spotlightEntityType && !filters.searchQuery) {
      return true
    }

    // Anchor filter: only the selected anchor's cluster is visible
    if (filters.activeAnchorId) {
      return cluster.anchor.id === filters.activeAnchorId
    }

    // Spotlight: cluster is visible if it contains the spotlighted entity type
    if (filters.spotlightEntityType) {
      return cluster.typeDistribution.some(t => t.entityType === filters.spotlightEntityType)
    }

    // Search: cluster is visible if anchor label matches
    if (filters.searchQuery) {
      return cluster.anchor.label.toLowerCase().includes(filters.searchQuery.toLowerCase())
    }

    return true
  }, [filters])

  return {
    viewMode,
    setViewMode,
    zoomLevel,
    activeClusterId,
    showEdges,
    setShowEdges,
    selectedEntityId,
    setSelectedEntityId,
    enterNeighborhood,
    returnToLandscape,
    filters,
    searchInput,
    setSearchInput,
    toggleAnchor,
    toggleSpotlight,
    setRecency,
    isClusterVisible,
  }
}
