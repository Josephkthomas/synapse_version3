export type EntityType =
  | 'Person' | 'Organization' | 'Team' | 'Topic' | 'Project'
  | 'Goal' | 'Action' | 'Risk' | 'Blocker' | 'Decision'
  | 'Insight' | 'Question' | 'Idea' | 'Concept' | 'Takeaway'
  | 'Lesson' | 'Document' | 'Event' | 'Location' | 'Technology'
  | 'Product' | 'Metric' | 'Hypothesis' | 'Anchor'

export type SourceType = 'Meeting' | 'YouTube' | 'Research' | 'Note' | 'Document'

export type RelationType =
  | 'leads_to' | 'supports' | 'blocks' | 'depends_on' | 'part_of'
  | 'authored' | 'mentions' | 'conflicts_with' | 'relates_to' | 'enables'
  | 'created' | 'achieved' | 'produced' | 'contradicts' | 'risks'
  | 'prevents' | 'challenges' | 'inhibits' | 'connected_to' | 'owns'
  | 'associated_with'

export interface KnowledgeNode {
  id: string
  user_id: string
  label: string
  entity_type: EntityType
  description?: string | null
  confidence?: number | null
  is_anchor: boolean
  source?: string | null
  source_type?: SourceType | null
  source_url?: string | null
  source_id?: string | null
  tags?: string[] | null
  user_tags?: string[] | null
  quote?: string | null
  created_at: string
}

export interface KnowledgeEdge {
  id: string
  user_id: string
  source_node_id: string
  target_node_id: string
  relation_type?: RelationType | null
  evidence?: string | null
  weight?: number | null
  created_at: string
}

export interface KnowledgeSource {
  id: string
  user_id: string
  title?: string | null
  content?: string | null
  source_type?: string | null
  source_url?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  professional_context: { role?: string; industry?: string; current_projects?: string }
  personal_interests: { topics?: string; learning_goals?: string }
  processing_preferences: { insight_depth?: string; relationship_focus?: string }
  created_at: string
  updated_at: string
}

export interface ExtractionSettings {
  id: string
  user_id: string
  default_mode: 'comprehensive' | 'strategic' | 'actionable' | 'relational'
  default_anchor_emphasis: 'passive' | 'standard' | 'aggressive'
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}
