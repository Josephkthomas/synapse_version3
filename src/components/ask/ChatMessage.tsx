import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { CitationBadges } from './CitationBadges'
import type { ChatMessage as ChatMessageType } from '../../types/rag'

interface ChatMessageProps {
  message: ChatMessageType
}

function parseContent(content: string): React.ReactNode {
  // Split by **bold** markers and line breaks
  const parts = content.split(/(\*\*[^*]+\*\*|\n\n|\n|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-body"
          style={{
            fontSize: 12,
            background: 'var(--color-bg-inset)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part === '\n\n') return <br key={i} />
    if (part === '\n') return <br key={i} />
    return part
  })
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const TRUNCATE_LENGTH = 500
  const shouldTruncate = isUser && message.content.length > TRUNCATE_LENGTH
  const displayContent = shouldTruncate && !expanded
    ? message.content.slice(0, TRUNCATE_LENGTH) + '...'
    : message.content

  if (isSystem) {
    return (
      <div
        className="flex justify-center font-body"
        style={{ animation: 'msg-enter 0.3s ease' }}
      >
        <style>{`
          @keyframes msg-enter {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            padding: '6px 12px',
            background: 'var(--color-bg-inset)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            maxWidth: '70%',
            textAlign: 'center',
          }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ animation: 'msg-enter 0.3s ease' }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'var(--color-accent-50)' : 'var(--color-bg-card)',
          border: isUser
            ? '1px solid rgba(214,58,0,0.15)'
            : '1px solid var(--border-subtle)',
        }}
      >
        {/* Role label */}
        <div
          className="flex items-center font-body"
          style={{
            gap: 6,
            paddingBottom: 5,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 6,
          }}
        >
          {!isUser && (
            <Sparkles size={11} style={{ color: 'var(--color-accent-500)' }} />
          )}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {isUser ? 'You' : 'Synapse'}
          </span>
        </div>

        {/* Content */}
        <div
          className="font-body"
          style={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'var(--color-text-body)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {parseContent(displayContent)}
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="font-body cursor-pointer"
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 11,
                color: 'var(--color-accent-500)',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <CitationBadges citations={message.citations} />
        )}
      </div>
    </div>
  )
}
