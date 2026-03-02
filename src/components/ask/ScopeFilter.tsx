import { useSettings } from '../../hooks/useSettings'

interface ScopeFilterProps {
  selectedAnchors: string[]
  onToggleAnchor: (anchorId: string) => void
  onClearScope: () => void
}

export function ScopeFilter({ selectedAnchors, onToggleAnchor, onClearScope }: ScopeFilterProps) {
  const { anchors } = useSettings()
  const isAllSelected = selectedAnchors.length === 0

  const activeCount = selectedAnchors.length

  return (
    <div>
      <div className="flex items-center" style={{ marginBottom: 4, gap: 6 }}>
        <span
          className="font-display font-bold uppercase"
          style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}
        >
          SCOPE
        </span>
        {activeCount > 0 && (
          <span
            className="font-body font-bold"
            style={{
              fontSize: 9,
              width: 14,
              height: 14,
              borderRadius: 7,
              background: '#b45309',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeCount}
          </span>
        )}
      </div>

      <div
        className="flex items-center"
        style={{ gap: 4, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}
      >
        {/* All pill */}
        <button
          type="button"
          onClick={onClearScope}
          className="font-body font-semibold cursor-pointer shrink-0"
          style={{
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 6,
            border: `1px solid ${isAllSelected ? 'rgba(214,58,0,0.25)' : 'var(--border-subtle)'}`,
            background: isAllSelected ? 'rgba(214,58,0,0.08)' : 'var(--color-bg-inset)',
            color: isAllSelected ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
        >
          All
        </button>

        {anchors.length === 0 ? (
          <span
            className="font-body"
            style={{ fontSize: 11, color: 'var(--color-text-placeholder)', paddingLeft: 4 }}
          >
            No anchors configured
          </span>
        ) : (
          anchors.map(anchor => {
            const isSelected = selectedAnchors.includes(anchor.id)
            return (
              <button
                key={anchor.id}
                type="button"
                onClick={() => onToggleAnchor(anchor.id)}
                className="font-body font-medium cursor-pointer shrink-0 flex items-center"
                style={{
                  gap: 5,
                  fontSize: 11,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isSelected ? 'rgba(180,83,9,0.25)' : 'var(--border-subtle)'}`,
                  background: isSelected ? 'rgba(180,83,9,0.08)' : 'var(--color-bg-inset)',
                  color: isSelected ? '#b45309' : 'var(--color-text-body)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: isSelected ? '#b45309' : 'var(--color-text-placeholder)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {anchor.label}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
