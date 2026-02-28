export interface SourceTypeConfig {
  color: string
  icon: string
  label: string
}

export const SOURCE_TYPE_CONFIG: Record<string, SourceTypeConfig> = {
  Meeting:  { color: '#3b82f6', icon: '🎙', label: 'Meeting' },
  YouTube:  { color: '#ef4444', icon: '▶',  label: 'YouTube' },
  Research: { color: '#8b5cf6', icon: '🔬', label: 'Research' },
  Note:     { color: '#10b981', icon: '✏️', label: 'Note' },
  Document: { color: '#f59e0b', icon: '📋', label: 'Document' },
}

export const DEFAULT_SOURCE_CONFIG: SourceTypeConfig = {
  color: '#6b7280',
  icon: '📄',
  label: 'Source',
}

export function getSourceConfig(sourceType: string | null | undefined): SourceTypeConfig {
  if (!sourceType) return DEFAULT_SOURCE_CONFIG
  return SOURCE_TYPE_CONFIG[sourceType] ?? DEFAULT_SOURCE_CONFIG
}
