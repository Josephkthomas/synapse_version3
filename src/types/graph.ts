export type GraphScope = 'overview' | 'anchors' | 'sources'

export interface SourceGraphNode {
  id: string
  kind: 'source'
  label: string
  sourceType: string
  color: string
  icon: string
  entityCount: number
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AnchorGraphNode {
  id: string
  kind: 'anchor'
  label: string
  entityType: string
  color: string
  connectionCount: number
  description: string | null
  confidence: number | null
}

export type GraphNode = SourceGraphNode | AnchorGraphNode

export interface GraphEdge {
  sourceId: string
  anchorId: string
  weight: number
}

export interface GraphData {
  sources: SourceGraphNode[]
  anchors: AnchorGraphNode[]
  edges: GraphEdge[]
  stats: { sourceCount: number; anchorCount: number; edgeCount: number }
}

export interface EntityDot {
  id: string
  label: string
  entityType: string
  color: string
  confidence: number | null
}

export interface SimulationNode {
  id: string
  kind: 'source' | 'anchor'
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  label: string
  color: string
  // source-specific
  sourceType?: string
  icon?: string
  entityCount?: number
  metadata?: Record<string, unknown>
  createdAt?: string
  // anchor-specific
  entityType?: string
  connectionCount?: number
  description?: string | null
  confidence?: number | null
}

export interface SimulationEdge {
  sourceId: string
  anchorId: string
  weight: number
}
