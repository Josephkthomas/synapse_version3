import { useEffect, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { fetchTopAnchor } from '../../services/supabase'

interface EmptyAskStateProps {
  onSendSuggestion: (text: string) => void
  isEmpty?: boolean
}

const STATIC_SUGGESTIONS = [
  'What connections exist between my recent meeting notes?',
  'What are the key risks across my active projects?',
]

export function EmptyAskState({ onSendSuggestion, isEmpty = false }: EmptyAskStateProps) {
  const { user } = useAuth()
  const [topAnchorLabel, setTopAnchorLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchTopAnchor(user.id)
      .then(setTopAnchorLabel)
      .catch(() => setTopAnchorLabel(null))
  }, [user])

  const dynamicSuggestion = topAnchorLabel
    ? `Summarize everything I know about ${topAnchorLabel}`
    : 'What are the most important themes in my knowledge?'

  const suggestions = [STATIC_SUGGESTIONS[0] ?? '', dynamicSuggestion, STATIC_SUGGESTIONS[1] ?? '']

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ padding: '40px 24px' }}>
        <MessageSquareText size={48} style={{ color: 'var(--color-text-placeholder)', marginBottom: 16 }} />
        <h2
          className="font-display font-bold"
          style={{ fontSize: 18, color: 'var(--color-text-primary)', marginBottom: 8 }}
        >
          Ask your knowledge graph
        </h2>
        <p
          className="font-body"
          style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 400, lineHeight: 1.6 }}
        >
          Start by ingesting content in the Ingest view. Once you have entities and source chunks,
          you can query them here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center" style={{ padding: '40px 24px' }}>
      <MessageSquareText size={48} style={{ color: 'var(--color-text-placeholder)', marginBottom: 16 }} />
      <h2
        className="font-display font-bold"
        style={{ fontSize: 18, color: 'var(--color-text-primary)', marginBottom: 8 }}
      >
        Ask your knowledge graph
      </h2>
      <p
        className="font-body"
        style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 400, lineHeight: 1.6, marginBottom: 24 }}
      >
        Ask questions and get answers grounded in your ingested content, with source citations and
        graph context.
      </p>

      <div className="flex flex-col items-center" style={{ gap: 8, width: '100%', maxWidth: 440 }}>
        <span
          className="font-display font-bold uppercase"
          style={{ fontSize: 10, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', marginBottom: 4 }}
        >
          Try Asking
        </span>
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSendSuggestion(suggestion)}
            className="w-full font-body cursor-pointer text-left"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-body)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '10px 16px',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
