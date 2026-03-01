import type { IntegrationConfig } from '../../types/ingest'

interface IntegrationCardProps {
  config: IntegrationConfig
  onConnect: () => void
}

export function IntegrationCard({ config, onConnect }: IntegrationCardProps) {
  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '14px 16px',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = ''
        ;(e.currentTarget as HTMLDivElement).style.transform = ''
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            flexShrink: 0,
            background: 'var(--color-bg-inset)',
          }}
        >
          {config.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-body font-semibold"
            style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}
          >
            {config.name}
          </div>
          <div
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {config.description}
          </div>

          {/* Status + Action */}
          <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
            <div className="flex items-center gap-1">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: config.status === 'connected'
                    ? 'var(--color-semantic-green-500)'
                    : 'var(--color-text-placeholder)',
                }}
              />
              <span className="font-body font-semibold" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                {config.status === 'connected' ? 'Connected' : 'Not connected'}
              </span>
            </div>

            <button
              type="button"
              onClick={onConnect}
              className="font-body font-semibold cursor-pointer"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderRadius: 5,
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--color-text-body)',
              }}
            >
              {config.status === 'connected' ? 'Manage' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
