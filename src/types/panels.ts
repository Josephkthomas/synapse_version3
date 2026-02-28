import type { KnowledgeNode, KnowledgeSource } from './database'

export type RightPanelContent =
  | { type: 'node'; data: KnowledgeNode }
  | { type: 'source'; data: KnowledgeSource }
  | { type: 'feed'; data: FeedItem }
  | null

export interface FeedItem {
  id: string
  source: string
  sourceType: string
  time: string
  nodeCount: number
  edgeCount: number
  summary: string
  entities: Array<{ label: string; type: string }>
  crossConnections: Array<{ from: string; to: string; relation: string }>
}
