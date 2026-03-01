import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Compass, MessageSquare, Plus, Zap, Search, Settings, type LucideIcon } from 'lucide-react'
import { useGraphContext } from '../../hooks/useGraphContext'
import { Kbd } from '../ui/Kbd'

const NAV_ITEMS: Array<{ id: string; label: string; path: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', path: '/', icon: Home },
  { id: 'explore', label: 'Explore', path: '/explore', icon: Compass },
  { id: 'ask', label: 'Ask', path: '/ask', icon: MessageSquare },
  { id: 'ingest', label: 'Ingest', path: '/ingest', icon: Plus },
  { id: 'automate', label: 'Automate', path: '/automate', icon: Zap },
]

interface NavRailProps {
  onOpenCommandPalette: () => void
  onOpenSettings: () => void
}

function NavItemButton({
  item,
  expanded,
}: {
  item: (typeof NAV_ITEMS)[number]
  expanded: boolean
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { clearRightPanel } = useGraphContext()
  const [hovered, setHovered] = useState(false)

  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.path)

  const Icon = item.icon

  const handleClick = () => {
    if (item.path !== '/ask') {
      clearRightPanel()
    }
    navigate(item.path)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center cursor-pointer border-none"
      style={{
        height: 40,
        width: expanded ? '100%' : 40,
        paddingLeft: expanded ? 10 : 0,
        paddingRight: expanded ? 12 : 0,
        gap: 12,
        borderRadius: 10,
        justifyContent: expanded ? 'flex-start' : 'center',
        background: isActive
          ? 'var(--color-accent-50)'
          : hovered
            ? 'rgba(0,0,0,0.04)'
            : 'transparent',
        transition: 'background 0.15s ease, width 0.2s ease, padding 0.2s ease',
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div
          className="absolute"
          style={{
            left: expanded ? -8 : -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 16,
            background: 'var(--color-accent-500)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      <Icon
        size={20}
        strokeWidth={1.8}
        className="shrink-0"
        style={{
          color: isActive
            ? 'var(--color-accent-500)'
            : hovered
              ? 'var(--color-text-body)'
              : 'var(--color-text-secondary)',
          transition: 'color 0.15s ease',
        }}
      />

      {expanded && (
        <span
          className="whitespace-nowrap overflow-hidden font-body text-[13px]"
          style={{
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontWeight: isActive ? 600 : 500,
          }}
        >
          {item.label}
        </span>
      )}
    </button>
  )
}

function UtilButton({
  icon: Icon,
  iconSize = 16,
  label,
  expanded,
  onClick,
  extra,
}: {
  icon: LucideIcon
  iconSize?: number
  label: string
  expanded: boolean
  onClick: () => void
  extra?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center cursor-pointer border-none rounded-[10px] hover:bg-bg-hover"
      style={{
        height: 40,
        width: expanded ? '100%' : 40,
        paddingLeft: expanded ? 10 : 0,
        paddingRight: expanded ? 12 : 0,
        gap: 12,
        justifyContent: expanded ? 'flex-start' : 'center',
        background: 'transparent',
        transition: 'background 0.15s ease, width 0.2s ease, padding 0.2s ease',
      }}
    >
      <Icon size={iconSize} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
      {expanded && (
        <span className="whitespace-nowrap overflow-hidden flex items-center gap-2 font-body text-[12px] text-text-secondary">
          {label}
          {extra}
        </span>
      )}
    </button>
  )
}

export function NavRail({ onOpenCommandPalette, onOpenSettings }: NavRailProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        width: expanded ? 190 : 56,
        background: 'var(--color-bg-frame)',
        borderRight: '1px solid var(--border-subtle)',
        transition: 'width 0.2s ease',
      }}
    >
      {/* Logo header — center the 30px logo in the 56px rail when collapsed */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 52,
          borderBottom: '1px solid var(--border-subtle)',
          paddingLeft: expanded ? 14 : 13,
          gap: 10,
          transition: 'padding 0.2s ease',
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--color-accent-500)',
            color: '#ffffff',
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          S
        </div>
        {expanded && (
          <span
            className="whitespace-nowrap overflow-hidden"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            Synapse
          </span>
        )}
      </div>

      {/* Nav items — center when collapsed, left-align when expanded */}
      <div
        className="flex flex-col gap-1 pt-7"
        style={{
          alignItems: expanded ? 'stretch' : 'center',
          paddingLeft: expanded ? 8 : 0,
          paddingRight: expanded ? 8 : 0,
          transition: 'padding 0.2s ease',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavItemButton key={item.id} item={item} expanded={expanded} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom utilities */}
      <div
        className="flex flex-col gap-1 pb-3 pt-2"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          alignItems: expanded ? 'stretch' : 'center',
          paddingLeft: expanded ? 8 : 0,
          paddingRight: expanded ? 8 : 0,
          transition: 'padding 0.2s ease',
        }}
      >
        <UtilButton
          icon={Search}
          label="Search"
          expanded={expanded}
          onClick={onOpenCommandPalette}
          extra={<Kbd>⌘K</Kbd>}
        />
        <UtilButton
          icon={Settings}
          label="Settings"
          expanded={expanded}
          onClick={onOpenSettings}
        />
      </div>
    </nav>
  )
}
