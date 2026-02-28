import { X } from 'lucide-react'
import { getEntityColor } from '../../config/entityTypes'

export interface FilterChip {
  id: string
  label: string
  type: 'entityType' | 'sourceType' | 'anchor' | 'tag' | 'confidence'
  value: string
}

interface FilterChipsProps {
  chips: FilterChip[]
  onRemove: (chip: FilterChip) => void
  onClearAll: () => void
}

export function FilterChips({ chips, onRemove, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-4"
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {chips.map(chip => {
        const isEntityType = chip.type === 'entityType'
        const color = isEntityType ? getEntityColor(chip.value) : undefined

        return (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 font-body text-[11px] font-semibold text-text-body rounded-full"
            style={{
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-default)',
              padding: '3px 8px 3px 8px',
              borderRadius: 20,
              transition: 'opacity 0.2s ease',
            }}
          >
            {isEntityType && color && (
              <span
                className="inline-block rounded-full shrink-0"
                style={{ width: 6, height: 6, backgroundColor: color }}
              />
            )}
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={() => onRemove(chip)}
              className="inline-flex items-center justify-center cursor-pointer ml-0.5"
              style={{ background: 'none', border: 'none', padding: 0 }}
              aria-label={`Remove ${chip.label} filter`}
            >
              <X size={10} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </span>
        )
      })}

      {chips.length >= 2 && (
        <button
          type="button"
          onClick={onClearAll}
          className="font-body text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
          style={{ background: 'none', border: 'none', padding: '2px 4px' }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
