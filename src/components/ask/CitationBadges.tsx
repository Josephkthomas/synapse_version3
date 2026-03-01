import { useGraphContext } from '../../hooks/useGraphContext'
import { fetchNodeById } from '../../services/supabase'
import { getEntityColor } from '../../config/entityTypes'
import type { Citation } from '../../types/rag'

interface CitationBadgesProps {
  citations: Citation[]
}

export function CitationBadges({ citations }: CitationBadgesProps) {
  const { setRightPanelContent, addRecentNode } = useGraphContext()

  if (citations.length === 0) return null

  const handleCitationClick = async (citation: Citation) => {
    if (!citation.node_id) return
    const node = await fetchNodeById(citation.node_id)
    if (node) {
      setRightPanelContent({ type: 'node', data: node })
      addRecentNode(node)
    }
  }

  return (
    <div
      className="flex items-center flex-wrap font-body"
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: '1px solid var(--border-subtle)',
        gap: 5,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          alignSelf: 'center',
          marginRight: 2,
        }}
      >
        SOURCES:
      </span>
      {citations.map((citation, i) => {
        const color = getEntityColor(citation.entity_type)
        return (
          <button
            key={i}
            type="button"
            onClick={() => void handleCitationClick(citation)}
            disabled={!citation.node_id}
            className="inline-flex items-center font-body font-semibold rounded cursor-pointer"
            style={{
              fontSize: 11,
              padding: '3px 8px',
              color,
              backgroundColor: `${color}10`,
              border: `1px solid ${color}29`,
              lineHeight: 1.4,
              cursor: citation.node_id ? 'pointer' : 'default',
            }}
          >
            {citation.label || citation.entity_type}
          </button>
        )
      })}
    </div>
  )
}
