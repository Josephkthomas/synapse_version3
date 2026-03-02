import { Network } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { RAGResponseContext } from '../../types/rag'

interface ExploreButtonProps {
  context: RAGResponseContext
  queryText: string
}

export function ExploreButton({ context, queryText }: ExploreButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    const nodeIds = context.relatedNodes.map(n => n.id)
    const edgeIds = context.relatedEdges.map(e => e.id)
    navigate('/explore', {
      state: {
        filterNodeIds: nodeIds,
        filterEdgeIds: edgeIds,
        fromAsk: true,
        queryText,
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-body font-semibold cursor-pointer flex items-center justify-center w-full"
      style={{
        gap: 6,
        fontSize: 12,
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid var(--border-default)',
        background: 'var(--color-bg-card)',
        color: 'var(--color-accent-500)',
        transition: 'background 0.15s ease, border-color 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = 'var(--color-accent-50)'
        el.style.borderColor = 'rgba(214,58,0,0.2)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = 'var(--color-bg-card)'
        el.style.borderColor = 'var(--border-default)'
      }}
    >
      <Network size={14} />
      Explore in Graph →
    </button>
  )
}
