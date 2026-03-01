import { X } from 'lucide-react'
import type { IntegrationConfig } from '../../types/ingest'

interface IntegrationSetupModalProps {
  integration: IntegrationConfig | null
  onClose: () => void
}

export function IntegrationSetupModal({ integration, onClose }: IntegrationSetupModalProps) {
  if (!integration) return null

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            width: 480,
            maxHeight: '80vh',
            background: 'var(--color-bg-card)',
            borderRadius: 16,
            padding: '28px 32px',
            position: 'relative',
            overflowY: 'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                background: 'var(--color-bg-inset)',
              }}
            >
              {integration.icon}
            </div>
            <div>
              <h3
                className="font-display font-bold"
                style={{ fontSize: 16, color: 'var(--color-text-primary)', margin: 0 }}
              >
                {integration.name}
              </h3>
              <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                {integration.description}
              </p>
            </div>
          </div>

          {/* Content */}
          {integration.comingSoon ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Coming soon — this integration is on our roadmap.
              </p>
              <button
                type="button"
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 12,
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-body)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Notify me
              </button>
            </div>
          ) : (
            <div>
              <p
                className="font-display font-bold"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 12,
                }}
              >
                Setup Instructions
              </p>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {integration.setupInstructions.map((step, i) => (
                  <li
                    key={i}
                    className="font-body"
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-body)',
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
