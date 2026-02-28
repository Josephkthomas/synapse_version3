import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Home, Compass, MessageSquare, Plus, Settings } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { Dot } from '../ui/Dot'
import { SectionLabel } from '../ui/SectionLabel'
import type { CommandPaletteItem } from '../../types/navigation'

interface CommandPaletteProps {
  onClose: () => void
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { anchors } = useSettings()
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build items list
  const items = useMemo<CommandPaletteItem[]>(() => {
    const navItems: CommandPaletteItem[] = [
      { id: 'nav-home', label: 'Go to Home', type: 'Navigation', category: 'Navigation', action: () => { navigate('/'); onClose() } },
      { id: 'nav-explore', label: 'Go to Explore', type: 'Navigation', category: 'Navigation', action: () => { navigate('/explore'); onClose() } },
      { id: 'nav-ask', label: 'Open Ask', type: 'Navigation', category: 'Navigation', action: () => { navigate('/ask'); onClose() } },
      { id: 'nav-ingest', label: 'Quick Capture', type: 'Navigation', category: 'Navigation', action: () => { navigate('/ingest'); onClose() } },
      { id: 'nav-settings', label: 'Open Settings', type: 'Navigation', category: 'Navigation', action: () => { onClose() } },
    ]

    const anchorItems: CommandPaletteItem[] = anchors.map(a => ({
      id: `anchor-${a.id}`,
      label: a.label,
      type: a.entity_type,
      category: 'Anchors',
      action: () => { navigate('/explore'); onClose() },
    }))

    return [...anchorItems, ...navItems]
  }, [anchors, navigate, onClose])

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query) return items
    const q = query.toLowerCase()
    return items.filter(item => item.label.toLowerCase().includes(q))
  }, [items, query])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Array<{ category: string; items: CommandPaletteItem[] }> = []
    const seen = new Set<string>()
    for (const item of filteredItems) {
      if (!seen.has(item.category)) {
        seen.add(item.category)
        groups.push({ category: item.category, items: [] })
      }
      groups.find(g => g.category === item.category)!.items.push(item)
    }
    return groups
  }, [filteredItems])

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        filteredItems[highlightedIndex]?.action()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredItems, highlightedIndex])

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${highlightedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  // Nav icons for rendering
  const navIcons: Record<string, React.ReactNode> = {
    'Go to Home': <Home size={14} strokeWidth={1.8} />,
    'Go to Explore': <Compass size={14} strokeWidth={1.8} />,
    'Open Ask': <MessageSquare size={14} strokeWidth={1.8} />,
    'Quick Capture': <Plus size={14} strokeWidth={1.8} />,
    'Open Settings': <Settings size={14} strokeWidth={1.8} />,
  }

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 flex justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', paddingTop: 100 }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 520,
          maxHeight: 460,
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
            placeholder="Search nodes, navigate, capture..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none font-body text-[14px] text-text-primary placeholder:text-text-placeholder"
          />
          <span className="inline-flex items-center rounded bg-bg-inset border border-border-subtle text-text-secondary font-body text-[10px] px-1.5 py-0.5">
            ESC
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto" style={{ padding: 6 }}>
          {filteredItems.length === 0 ? (
            <p className="text-center text-[12px] text-text-placeholder py-8">No results found</p>
          ) : (
            grouped.map(group => (
              <div key={group.category} className="mb-2">
                <div className="px-3 py-2">
                  <SectionLabel>{group.category}</SectionLabel>
                </div>
                {group.items.map(item => {
                  flatIndex++
                  const idx = flatIndex
                  const isHighlighted = idx === highlightedIndex
                  const isAnchor = item.category === 'Anchors'

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-index={idx}
                      onClick={item.action}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className="flex items-center gap-3 w-full border-none cursor-pointer"
                      style={{
                        padding: '7px 12px',
                        borderRadius: 8,
                        background: isHighlighted ? 'var(--color-bg-hover)' : 'transparent',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      {isAnchor ? (
                        <Dot type={item.type} size={7} />
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', display: 'flex' }}>
                          {navIcons[item.label]}
                        </span>
                      )}
                      <span className="font-body text-[13px] font-medium text-text-primary flex-1 text-left">
                        {item.label}
                      </span>
                      <span className="font-body text-[10px] text-text-secondary">
                        {isAnchor ? item.type : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 shrink-0"
          style={{ padding: '8px 16px', borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="font-body text-[10px] text-text-secondary">↑↓ Navigate</span>
          <span className="font-body text-[10px] text-text-secondary">↵ Select</span>
          <span className="font-body text-[10px] text-text-secondary">⌘K Toggle</span>
        </div>
      </div>
    </div>
  )
}
