export const ENTITY_TYPE_COLORS: Record<string, string> = {
  Person: '#d97706',
  Organization: '#7c3aed',
  Team: '#7c3aed',
  Topic: '#0891b2',
  Project: '#059669',
  Goal: '#e11d48',
  Action: '#2563eb',
  Risk: '#dc2626',
  Blocker: '#dc2626',
  Decision: '#db2777',
  Insight: '#7c3aed',
  Question: '#ea580c',
  Idea: '#ca8a04',
  Concept: '#4f46e5',
  Takeaway: '#0891b2',
  Lesson: '#65a30d',
  Document: '#6b7280',
  Event: '#8b5cf6',
  Location: '#14b8a6',
  Technology: '#0d9488',
  Product: '#059669',
  Metric: '#6366f1',
  Hypothesis: '#a855f7',
  Anchor: '#b45309',
}

export function getEntityColor(type: string): string {
  return ENTITY_TYPE_COLORS[type] ?? '#808080'
}
