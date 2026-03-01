import { useState } from 'react'
import { useGraphContext } from '../../hooks/useGraphContext'
import { supabase } from '../../services/supabase'
import type { EnrichedChunk } from '../../types/rag'
import type { KnowledgeSource } from '../../types/database'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getRelevanceBorderWidth(similarity: number): number {
  if (similarity >= 0.85) return 4
  if (similarity >= 0.7) return 3
  return 2
}

interface SourceChunkCardProps {
  chunk: EnrichedChunk
}

export function SourceChunkCard({ chunk }: SourceChunkCardProps) {
  const { setRightPanelContent } = useGraphContext()
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleSourceClick = async () => {
    const { data } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', chunk.source_id)
      .maybeSingle()

    if (data) {
      setRightPanelContent({ type: 'source', data: data as KnowledgeSource })
    }
  }

  const borderWidth = getRelevanceBorderWidth(chunk.similarity)

  return (
    <div
      className="font-body cursor-pointer"
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-bg-card)',
        border: `1px solid ${hovered ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        borderLeft: `${borderWidth}px solid var(--color-accent-200)`,
        borderRadius: 8,
        padding: 12,
        cursor: 'pointer',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Source title + meta */}
      <div className="flex items-center justify-between mb-1.5" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); void handleSourceClick() }}
          className="font-semibold text-left cursor-pointer"
          style={{
            fontSize: 11,
            color: 'var(--color-accent-500)',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          {chunk.sourceTitle}
        </button>
        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {chunk.sourceType} · {formatRelativeTime(chunk.sourceCreatedAt)}
        </span>
      </div>

      {/* Chunk text */}
      <p
        style={{
          fontSize: 11,
          color: 'var(--color-text-body)',
          lineHeight: 1.5,
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? undefined : 4,
          WebkitBoxOrient: 'vertical' as const,
          overflow: expanded ? 'visible' : 'hidden',
          transition: 'max-height 0.2s ease',
        }}
      >
        {chunk.content}
      </p>
    </div>
  )
}
