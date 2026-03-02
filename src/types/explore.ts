// src/types/explore.ts — Shared types for Explore page (PRDs 4A–4E)

export type ExploreViewMode = 'entities' | 'sources'
export type ZoomLevel = 'landscape' | 'neighborhood' | 'detail'

export interface ClusterData {
  anchor: AnchorNode
  entityCount: number
  typeDistribution: TypeDistributionEntry[]
  position: { cx: number; cy: number; r: number }
  crossClusterEdges: CrossClusterEdge[]
}

export interface TypeDistributionEntry {
  entityType: string
  count: number
  percentage: number // 0–1
}

export interface CrossClusterEdge {
  targetClusterId: string
  sharedEntityCount: number
  crossEdgeCount: number
  totalWeight: number
}

export interface AnchorNode {
  id: string
  label: string
  entityType: string
  description: string | null
  entityCount: number
}

export interface EntityNode {
  id: string
  label: string
  entityType: string
  description: string | null
  confidence: number | null
  connectionCount: number
  clusters: string[] // anchor IDs this entity belongs to
  sourceId: string | null
  sourceName: string | null
  sourceType: string | null
  tags: string[]
  createdAt: string
  isBridge: boolean // belongs to 2+ clusters
  isUnclustered: boolean // belongs to 0 clusters
}

export interface SourceNode {
  id: string
  title: string
  sourceType: string
  entityIds: string[]
  entityCount: number
  createdAt: string
}

export interface SourceEdge {
  fromSourceId: string
  toSourceId: string
  sharedEntityCount: number
  sharedEntityIds: string[]
}

export interface ExploreFilters {
  searchQuery: string
  activeAnchorId: string | null
  spotlightEntityType: string | null
  recency: '7d' | '30d' | 'all'
}

export interface ContextBasketItem {
  nodeId: string
  label: string
  entityType: string
}

export type ExploreRightPanelContent =
  | { type: 'node'; data: EntityNode }
  | { type: 'source'; data: SourceNode }
  | { type: 'cluster'; data: ClusterData }
  | null
