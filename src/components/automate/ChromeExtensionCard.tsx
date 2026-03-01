import { IntegrationStatusCard } from './IntegrationStatusCard'
import type { AutomationSummary } from '../../types/automate'

interface ChromeExtensionCardProps {
  summary: AutomationSummary
}

export function ChromeExtensionCard({ summary }: ChromeExtensionCardProps) {
  const { captureCount, connected } = summary.extension

  const status = connected ? 'active' : 'idle'
  const description = connected
    ? 'Connected · One-click capture'
    : 'Not installed'
  const metric = `${captureCount} captures`

  return (
    <IntegrationStatusCard
      title="Chrome Extension"
      description={description}
      status={status}
      metric={metric}
    >
      {connected ? (
        <p
          className="font-body"
          style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '4px 0' }}
        >
          The Synapse Chrome Extension is connected and capturing content.
        </p>
      ) : (
        <div style={{ padding: '4px 0' }}>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}
          >
            Install the Synapse Chrome Extension to capture content from any web page or YouTube video.
          </p>
          <button
            type="button"
            className="font-body font-semibold cursor-pointer"
            style={{
              fontSize: 11,
              padding: '6px 12px',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Install Extension
          </button>
        </div>
      )}
    </IntegrationStatusCard>
  )
}
