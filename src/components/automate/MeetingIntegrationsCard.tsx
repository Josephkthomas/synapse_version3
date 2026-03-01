import { useNavigate } from 'react-router-dom'
import { IntegrationStatusCard } from './IntegrationStatusCard'
import type { AutomationSummary } from '../../types/automate'

interface MeetingIntegrationsCardProps {
  summary: AutomationSummary
}

const INTEGRATIONS = [
  { id: 'circleback', name: 'Circleback', icon: '🔵', comingSoon: false },
  { id: 'fireflies', name: 'Fireflies', icon: '🟣', comingSoon: true },
  { id: 'tldv', name: 'tl;dv', icon: '🟢', comingSoon: true },
  { id: 'meetgeek', name: 'MeetGeek', icon: '🟡', comingSoon: true },
]

export function MeetingIntegrationsCard({ summary }: MeetingIntegrationsCardProps) {
  const navigate = useNavigate()
  const { totalMeetings, circlebackConnected } = summary.meetings

  const status = circlebackConnected ? 'active' : 'idle'
  const description = circlebackConnected
    ? 'Circleback connected'
    : 'No services connected'
  const metric = `${totalMeetings} meetings`

  return (
    <IntegrationStatusCard
      title="Meeting Integrations"
      description={description}
      status={status}
      metric={metric}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {INTEGRATIONS.map(integration => {
          const isConnected = integration.id === 'circleback' && circlebackConnected
          return (
            <div key={integration.id} className="flex items-center justify-between" style={{ padding: '3px 0' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12 }}>{integration.icon}</span>
                <span
                  className="font-body font-semibold"
                  style={{ fontSize: 12, color: 'var(--color-text-primary)' }}
                >
                  {integration.name}
                </span>
                {integration.comingSoon && (
                  <span
                    className="font-body"
                    style={{ fontSize: 9, color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}
                  >
                    Coming soon
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#10b981' : '#808080',
                    display: 'inline-block',
                  }}
                />
                <span
                  className="font-body"
                  style={{
                    fontSize: 10,
                    color: isConnected ? '#10b981' : 'var(--color-text-secondary)',
                  }}
                >
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate('/ingest?tab=meetings')}
        className="font-body font-semibold cursor-pointer"
        style={{
          fontSize: 11,
          padding: '6px 12px',
          borderRadius: 6,
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          color: 'var(--color-text-secondary)',
          marginTop: 10,
        }}
      >
        Configure Integrations
      </button>
    </IntegrationStatusCard>
  )
}
