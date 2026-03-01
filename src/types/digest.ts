import type { Citation } from './rag'
import type { KnowledgeNode } from './database'

export interface DigestChannel {
  id: string
  digest_profile_id: string
  user_id: string
  channel_type: 'email' | 'telegram' | 'slack'
  is_active: boolean
  config: Record<string, string>
  density_override: 'brief' | 'standard' | 'comprehensive' | null
  created_at: string
}

export interface ModuleOutput {
  templateId: string
  templateName: string
  content: string
  citations: Citation[]
  relatedNodes: KnowledgeNode[]
  generationDurationMs: number
  error?: string
}

export interface DigestOutput {
  profileId: string
  title: string
  generatedAt: string
  executiveSummary: string
  modules: ModuleOutput[]
  totalDurationMs: number
}

export interface DeliveryResult {
  channelType: string
  success: boolean
  error?: string
  sentAt?: string
}

export interface DigestHistoryEntry {
  id: string
  digest_profile_id: string
  user_id: string
  generated_at: string
  content: DigestOutput
  module_outputs: ModuleOutput[]
  executive_summary: string
  density: string
  generation_duration_ms: number
  status: 'generated' | 'delivered' | 'failed'
  delivery_results: DeliveryResult[]
  created_at: string
}

export interface DigestModuleInput {
  template_id: string
  custom_context?: string
  sort_order: number
}

export interface DigestChannelInput {
  channel_type: 'email' | 'telegram' | 'slack'
  config: Record<string, string>
  density_override?: 'brief' | 'standard' | 'comprehensive'
}
