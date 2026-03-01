import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface IntegrationStatusCardProps {
  title: string
  description: string
  status: 'active' | 'idle' | 'error'
  metric: string
  expandable?: boolean
  onClick?: () => void
  children?: React.ReactNode
}

const STATUS_CONFIG = {
  active: { color: '#10b981', label: 'active' },
  idle: { color: '#808080', label: 'idle' },
  error: { color: 'var(--semantic-red-500, #ef4444)', label: 'error' },
}

export function IntegrationStatusCard({
  title,
  description,
  status,
  metric,
  expandable = true,
  onClick,
  children,
}: IntegrationStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[status]

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (expandable && children) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--border-default)'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--border-subtle)'
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        style={{ padding: '16px 20px' }}
        onClick={handleClick}
      >
        {/* Left */}
        <div>
          <div
            className="font-display font-bold"
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}
          >
            {title}
          </div>
          <div
            className="font-body"
            style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
          >
            {description}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="flex items-center gap-1.5" style={{ justifyContent: 'flex-end', marginBottom: 2 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: statusCfg.color,
                  display: 'inline-block',
                }}
              />
              <span
                className="font-body font-semibold"
                style={{ fontSize: 11, color: statusCfg.color }}
              >
                {statusCfg.label}
              </span>
            </div>
            <div
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
            >
              {metric}
            </div>
          </div>

          {expandable && children && (
            <ChevronDown
              size={14}
              style={{
                color: 'var(--color-text-secondary)',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && children && (
        <div
          style={{
            padding: '0 20px 16px',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: -1,
            paddingTop: 14,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
