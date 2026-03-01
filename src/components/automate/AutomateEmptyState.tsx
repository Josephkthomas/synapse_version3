import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

export function AutomateEmptyState() {
  const navigate = useNavigate()

  return (
    <div style={{ textAlign: 'center', padding: '64px 0' }}>
      <Zap
        size={56}
        strokeWidth={1.2}
        style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 16px' }}
      />
      <p
        className="font-display font-bold"
        style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}
      >
        No automations configured
      </p>
      <p
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          maxWidth: 420,
          margin: '0 auto 20px',
          lineHeight: 1.5,
        }}
      >
        Connect YouTube channels, playlists, or meeting services to automatically ingest content into your knowledge graph.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/ingest?tab=youtube')}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 20px',
            borderRadius: 8,
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-body)',
          }}
        >
          Connect YouTube
        </button>
        <button
          type="button"
          onClick={() => navigate('/ingest?tab=meetings')}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 20px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Set up Meetings
        </button>
      </div>
    </div>
  )
}
