import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface FilterOption<T extends string> {
  value: T
  label: string
}

interface FilterDropProps<T extends string> {
  label: string
  options: FilterOption<T>[]
  selected: T[]
  onToggle: (value: T) => void
  colorMap?: Record<string, string> | null
  iconMap?: Record<string, string> | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function FilterDrop<T extends string>({
  label,
  options,
  selected,
  onToggle,
  colorMap,
  iconMap,
  isOpen,
  onOpenChange,
}: FilterDropProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer)
    const t = setTimeout(() => onOpenChange(false), 5000)
    setIdleTimer(t)
  }

  useEffect(() => {
    if (!isOpen) {
      if (idleTimer) clearTimeout(idleTimer)
      return
    }
    resetIdleTimer()
    return () => {
      if (idleTimer) clearTimeout(idleTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onOpenChange])

  const hasActive = selected.length > 0

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-body text-[12px] font-semibold text-text-secondary cursor-pointer border"
        style={{
          background: isOpen ? 'var(--color-bg-inset)' : 'transparent',
          borderColor: isOpen ? 'var(--border-default)' : 'var(--border-subtle)',
          transition: 'all 0.15s ease',
        }}
      >
        <span>{label}</span>
        {hasActive && (
          <span
            className="font-body font-bold text-[9px] rounded px-1 py-0.5 leading-none"
            style={{
              background: 'var(--color-accent-50)',
              color: 'var(--color-accent-500)',
            }}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={12}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 rounded-[10px] z-50 overflow-y-auto"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            maxHeight: 280,
            minWidth: 180,
            padding: '8px',
          }}
          onMouseMove={resetIdleTimer}
        >
          {hasActive && (
            <button
              type="button"
              onClick={() => {
                selected.forEach(v => onToggle(v))
                resetIdleTimer()
              }}
              className="flex items-center gap-1 w-full px-2 py-1 mb-1 font-body text-[11px] text-text-secondary hover:text-text-primary cursor-pointer rounded-md"
              style={{ background: 'transparent', border: 'none' }}
            >
              <X size={10} />
              Clear
            </button>
          )}

          {options.map(opt => {
            const isChecked = selected.includes(opt.value)
            const color = colorMap?.[opt.value]
            const icon = iconMap?.[opt.value]

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onToggle(opt.value)
                  resetIdleTimer()
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md cursor-pointer font-body text-[12px] text-text-body"
                style={{
                  background: 'transparent',
                  border: 'none',
                  height: 32,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-hover)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                {/* Checkbox */}
                <span
                  className="shrink-0 flex items-center justify-center rounded"
                  style={{
                    width: 16,
                    height: 16,
                    border: isChecked ? 'none' : '1.5px solid var(--border-default)',
                    background: isChecked ? 'var(--color-accent-500)' : 'var(--color-bg-inset)',
                  }}
                >
                  {isChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                {/* Color dot */}
                {color && (
                  <span
                    className="shrink-0 rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: color }}
                  />
                )}

                {/* Emoji icon */}
                {icon && !color && (
                  <span className="shrink-0 text-[13px]">{icon}</span>
                )}

                <span className="truncate text-left">{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
