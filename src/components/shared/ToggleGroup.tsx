import type { ReactNode } from 'react'

interface ToggleOption<T extends string> {
  key: T
  label: string
  badge?: ReactNode
}

interface ToggleGroupProps<T extends string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  style?: React.CSSProperties
}

export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  style,
}: ToggleGroupProps<T>) {
  return (
    <div
      className="flex"
      style={{
        background: 'var(--color-bg-inset)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
        ...style,
      }}
    >
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className="flex-1 flex items-center justify-center font-body font-semibold cursor-pointer rounded-lg"
          style={{
            fontSize: 12,
            padding: '9px 0',
            background:
              value === opt.key ? 'var(--color-bg-card)' : 'transparent',
            border: 'none',
            color:
              value === opt.key
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)',
            boxShadow:
              value === opt.key ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            transition: 'background 0.15s ease, color 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
          {opt.badge}
        </button>
      ))}
    </div>
  )
}
