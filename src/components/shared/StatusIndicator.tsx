interface StatusDotProps {
  status: 'active' | 'connected' | 'paused' | 'disconnected' | 'error' | string
  size?: number
  pulse?: boolean
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'connected':
      return 'var(--color-semantic-green-500, #22c55e)'
    case 'paused':
      return 'var(--color-semantic-amber-500, #f59e0b)'
    case 'error':
      return 'var(--color-semantic-red-500, #ef4444)'
    case 'disconnected':
    default:
      return 'var(--color-text-secondary)'
  }
}

export function StatusDot({ status, size = 6, pulse = false }: StatusDotProps) {
  const color = getStatusColor(status)

  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        animation: pulse ? 'pulse 1.5s ease-in-out infinite' : undefined,
      }}
    />
  )
}

interface StatusLabelProps {
  status: 'active' | 'connected' | 'paused' | 'disconnected' | 'error' | string
  size?: number
}

function statusText(status: string): string {
  switch (status) {
    case 'active': return 'Active'
    case 'connected': return 'Connected'
    case 'paused': return 'Paused'
    case 'disconnected': return 'Disconnected'
    case 'error': return 'Error'
    default: return status
  }
}

export function StatusLabel({ status, size = 11 }: StatusLabelProps) {
  const color = getStatusColor(status)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <StatusDot status={status} size={6} />
      <span
        className="font-body"
        style={{
          fontSize: size,
          fontWeight: 600,
          color,
          textTransform: 'capitalize',
        }}
      >
        {statusText(status)}
      </span>
    </span>
  )
}
