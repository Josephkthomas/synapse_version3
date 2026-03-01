import type { KnowledgeNode, KnowledgeEdge } from './database'

export type RAGPipelineStep =
  | 'embedding'
  | 'semantic_search'
  | 'keyword_search'
  | 'graph_traversal'
  | 'context_assembly'
  | 'generating'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Citation[]
  timestamp: Date
  pipelineDurationMs?: number
}

export interface Citation {
  label: string
  entity_type: string
  node_id: string | null
  source_id: string | null
}

export interface SourceChunkResult {
  id: string
  source_id: string
  chunk_index: number
  content: string
  similarity: number
  sourceTitle?: string
  sourceType?: string
  sourceCreatedAt?: string
}

export interface EnrichedChunk {
  id: string
  source_id: string
  content: string
  similarity: number
  sourceTitle: string
  sourceType: string
  sourceCreatedAt: string
}

export interface NodeSummary {
  id: string
  label: string
  entity_type: string
  description: string | null
}

export interface RelationshipPath {
  from: string
  relation: string
  to: string
  evidence?: string
}

export interface RAGContext {
  sourceChunks: EnrichedChunk[]
  nodeSummaries: NodeSummary[]
  relationshipPaths: RelationshipPath[]
}

export interface RAGResponseContext {
  sourceChunks: EnrichedChunk[]
  relatedNodes: KnowledgeNode[]
  relatedEdges: KnowledgeEdge[]
  citations: Citation[]
}

export interface RAGGenerationResult {
  answer: string
  citations: Citation[]
}

export interface SemanticChunkResult {
  id: string
  source_id: string
  chunk_index: number
  content: string
  similarity: number
}

export interface KeywordNodeResult {
  id: string
  label: string
  entity_type: string
  description: string | null
  source: string | null
  source_type: string | null
  source_id: string | null
  confidence: number | null
  is_anchor: boolean
  tags: string[] | null
  created_at: string
}

export interface KeywordSourceResult {
  id: string
  title: string | null
  source_type: string | null
  source_url: string | null
  created_at: string
}

export interface GraphStats {
  nodeCount: number
  chunkCount: number
  edgeCount: number
  sourceCount: number
}
