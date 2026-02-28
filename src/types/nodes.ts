import type { KnowledgeNode, KnowledgeEdge } from './database'

export interface NodeWithMeta extends KnowledgeNode {
  connectionCount: number
  anchorLabels: string[]
}

export interface NodeNeighbor {
  node: Pick<KnowledgeNode, 'id' | 'label' | 'entity_type' | 'description'>
  edge: Pick<KnowledgeEdge, 'id' | 'relation_type' | 'evidence' | 'weight'>
  direction: 'outgoing' | 'incoming'
}

export interface NodeFilters {
  search?: string
  entityTypes?: string[]
  sourceTypes?: string[]
  anchorIds?: string[]
  tags?: string[]
  minConfidence?: number
}

export interface PaginationOptions {
  page: number
  pageSize: number
}
