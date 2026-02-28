import { useState } from 'react'
import { Zap, X } from 'lucide-react'
import type { RecentConnection } from '../../hooks/useCrossConnections'

interface ConnectionDiscoveryCardProps {
  connection: RecentConnection
}

export function ConnectionDiscoveryCard({ connection }: ConnectionDiscoveryCardProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className="flex gap-2.5 rounded-[12px] relative"
      style={{
        background: '#7c3aed0D',
        border: '1px solid rgba(124,58,237,0.16)',
        padding: '14px 18px',
        marginBottom: 20,
      }}
    >
      <Zap
        size={15}
        style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }}
      />
      <div className="flex-1 pr-4">
        <p
          className="font-body font-semibold"
          style={{ fontSize: 11, color: '#7c3aed', marginBottom: 3 }}
        >
          Connection Discovered
        </p>
        <p
          className="font-body"
          style={{ fontSize: 13, color: 'var(--color-text-body)', lineHeight: 1.5 }}
        >
          Your <strong>{connection.fromSourceTitle}</strong> mentions '{connection.entityLabel}'{' '}
          — connecting to entities in your {connection.toSourceTitle}.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute flex items-center justify-center cursor-pointer"
        style={{
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}
        aria-label="Dismiss"
      >
        <X size={10} />
      </button>
    </div>
  )
}
