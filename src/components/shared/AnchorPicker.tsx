import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { searchNodes } from '../../services/supabase'
import { Dot } from '../ui/Dot'
import type { KnowledgeNode } from '../../types/database'

interface AnchorPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (node: KnowledgeNode) => void
  excludeIds?: string[]
  mode?: 'promote' | 'select' // reserved for future label variation
}

export function AnchorPicker({ isOpen, onClose, onSelect, excludeIds = [], mode: _mode = 'promote' }: AnchorPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KnowledgeNode[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Keyboard: Esc closes
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const data = await searchNodes(q)
    setResults(data.filter(n => !excludeIds.includes(n.id)))
    setLoading(false)
  }, [excludeIds])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleSelect = (node: KnowledgeNode) => {
    onSelect(node)
    onClose()
  }

  if (!isOpen) return null

  const showHint = query.length < 2
  const showEmpty = !loading && query.length >= 2 && results.length === 0

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 480,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 shrink-0"
          style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Search size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search entities..."
            value={query}
            onChange={handleQueryChange}
            className="flex-1 bg-transparent border-none outline-none font-body text-[14px] text-text-primary placeholder:text-text-placeholder"
          />
          <span className="inline-flex items-center rounded bg-bg-inset border border-border-subtle text-text-secondary font-body text-[10px] px-1.5 py-0.5">
            ESC
          </span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {showHint && (
            <p className="text-center font-body text-[12px] py-8" style={{ color: 'var(--color-text-placeholder)' }}>
              Type to search entities...
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          )}

          {showEmpty && (
            <p className="text-center font-body text-[12px] py-8" style={{ color: 'var(--color-text-secondary)' }}>
              No matching entities found
            </p>
          )}

          {!loading && results.map(node => (
            <button
              key={node.id}
              type="button"
              onClick={() => handleSelect(node)}
              className="flex items-center gap-3 w-full border-none cursor-pointer"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'transparent',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Dot type={node.entity_type} size={7} />
              <span className="font-body text-[13px] font-medium text-text-primary flex-1 text-left">
                {node.label}
              </span>
              <span
                className="font-body text-[10px]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {node.entity_type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
