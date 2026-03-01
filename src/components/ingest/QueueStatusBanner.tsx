import { useNavigate } from 'react-router-dom'
import type { QueueStats } from '../../types/youtube'

interface QueueStatusBannerProps {
  stats: QueueStats
}

export function QueueStatusBanner({ stats }: QueueStatusBannerProps) {
  const navigate = useNavigate()
  const total = stats.pending + stats.processing + stats.completed + stats.failed

  if (total === 0) return null

  return (
    <>
      <style>{`
        @keyframes queuePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div
        style={{
          background: 'var(--color-accent-50)',
          border: '1px solid var(--color-accent-100)',
          borderRadius: 10,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 16,
        }}
      >
        {/* Stat groups */}
        <StatGroup label="Pending" count={stats.pending} dotColor="var(--color-semantic-amber-500)" />
        <StatGroup label="Processing" count={stats.processing} dotColor="var(--color-accent-500)" pulse />
        <StatGroup label="Complete" count={stats.completed} dotColor="var(--color-semantic-green-500)" />
        <StatGroup label="Failed" count={stats.failed} dotColor="var(--color-semantic-red-500)" />

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => navigate('/automate')}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 11,
            background: 'transparent',
            border: 'none',
            color: 'var(--color-accent-500)',
            textDecoration: 'none',
            padding: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'underline' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.textDecoration = 'none' }}
        >
          View Queue
        </button>
      </div>
    </>
  )
}

function StatGroup({ label, count, dotColor, pulse }: {
  label: string
  count: number
  dotColor: string
  pulse?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            animation: pulse ? 'queuePulse 1.5s infinite' : 'none',
          }}
        />
        <span className="font-body font-bold" style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
          {count}
        </span>
      </div>
      <span className="font-body" style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}
