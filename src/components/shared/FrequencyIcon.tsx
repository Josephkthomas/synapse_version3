import { Sun, CalendarDays, Calendar, type LucideIcon } from 'lucide-react'

interface FrequencyConfig {
  icon: LucideIcon
  color: string
  bg: string
  label: string
}

const DEFAULT_CONFIG: FrequencyConfig = { icon: CalendarDays, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'Weekly' }

const FREQUENCY_CONFIG: Record<string, FrequencyConfig> = {
  daily:   { icon: Sun,          color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Daily' },
  weekly:  DEFAULT_CONFIG,
  monthly: { icon: Calendar,     color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  label: 'Monthly' },
}

export function getFrequencyConfig(frequency: string): FrequencyConfig {
  return FREQUENCY_CONFIG[frequency] ?? DEFAULT_CONFIG
}

interface FrequencyIconProps {
  frequency: 'daily' | 'weekly' | 'monthly'
  size?: number
  boxSize?: number
}

export function FrequencyIcon({ frequency, size = 16, boxSize = 32 }: FrequencyIconProps) {
  const config = getFrequencyConfig(frequency)
  const Icon = config.icon

  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: 8,
        background: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} strokeWidth={1.5} style={{ color: config.color }} />
    </div>
  )
}
