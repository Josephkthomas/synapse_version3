import type { KnowledgeSource } from './database'

export interface DailyStats {
  sourcesProcessed: number
  newEntities: number
  relationshipsDiscovered: number
}

export interface FeedEntityBadge {
  id: string
  label: string
  entityType: string
  confidence: number | null
}

export interface WithinSourceConnection {
  id: string
  fromNodeId: string
  fromLabel: string
  fromEntityType: string
  toNodeId: string
  toLabel: string
  toEntityType: string
  relationType: string
  isAnchor: boolean
}

export interface CrossConnection {
  id: string
  fromNodeId: string
  fromLabel: string
  fromEntityType: string
  toNodeId: string
  toLabel: string
  toEntityType: string
  relationType: string
  isAnchor: boolean
  toSourceId: string | null
  toSourceTitle: string | null
  toSourceType: string | null
}

export interface FeedItem {
  source: KnowledgeSource
  entityCount: number
  relationCount: number
  entities: FeedEntityBadge[]
  withinSourceConnections: WithinSourceConnection[]
  crossConnections: CrossConnection[]
  summary: string | null
}

export interface DigestModule {
  id: string
  templateId: string
  sortOrder: number
  isActive: boolean
  customContext?: string
}

export interface DigestProfile {
  id: string
  title: string
  frequency: 'daily' | 'weekly' | 'monthly'
  isActive: boolean
  scheduleTime: string
  scheduleTimezone: string
  density: 'brief' | 'standard' | 'comprehensive'
  createdAt: string
  modules: DigestModule[]
  status: 'ready' | 'scheduled'
}
