import { useRef, useState, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setValue('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 120) + 'px'
    setValue(target.value)
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div
      className="shrink-0"
      style={{
        background: 'var(--color-bg-card)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '14px 24px',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 840 }}>
        {/* Input container */}
        <div
          className="flex items-center"
          style={{
            background: 'var(--color-bg-inset)',
            border: `1px solid ${focused ? 'rgba(214,58,0,0.3)' : 'var(--border-default)'}`,
            borderRadius: 12,
            padding: '10px 14px',
            gap: 10,
            boxShadow: focused ? '0 0 0 3px var(--color-accent-50)' : 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask your knowledge graph anything..."
            value={value}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="font-body flex-1 resize-none outline-none"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 flex items-center justify-center cursor-pointer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: canSend ? 'var(--color-accent-500)' : 'var(--color-accent-500)',
              border: 'none',
              opacity: canSend ? 1 : 0.3,
              cursor: canSend ? 'pointer' : 'default',
              pointerEvents: canSend ? 'auto' : 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => {
              if (canSend) (e.currentTarget as HTMLButtonElement).style.background = '#b83300'
            }}
            onMouseLeave={e => {
              if (canSend) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-accent-500)'
            }}
          >
            <ArrowUp size={13} color="#ffffff" />
          </button>
        </div>

        {/* Helper text */}
        <p
          className="font-body text-center"
          style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 6 }}
        >
          Retrieves from source chunks, entities, and graph traversal
        </p>
      </div>
    </div>
  )
}
