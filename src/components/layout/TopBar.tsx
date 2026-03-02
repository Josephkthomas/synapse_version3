import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSettings } from '../../hooks/useSettings'
import { supabase } from '../../services/supabase'
import { Kbd } from '../ui/Kbd'

const VIEW_TITLES: Record<string, string> = {
  '/': 'Home',
  '/explore': 'Explore',
  '/ask': 'Ask',
  '/ingest': 'Ingest',
  '/automate': 'Automate',
}

interface TopBarProps {
  onOpenSettings: () => void
  onOpenCommandPalette: () => void
}

export function TopBar({ onOpenSettings, onOpenCommandPalette }: TopBarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const { profile } = useSettings()
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)

  const viewTitle = VIEW_TITLES[location.pathname] ?? 'Synapse'

  // Get initial from profile name or email
  const profileName = profile?.professional_context?.role
  const displayName = profileName ?? user?.email ?? ''
  const initial = displayName.charAt(0).toUpperCase() || '?'

  useEffect(() => {
    async function fetchCounts() {
      const [nodes, edges] = await Promise.all([
        supabase.from('knowledge_nodes').select('*', { count: 'exact', head: true }),
        supabase.from('knowledge_edges').select('*', { count: 'exact', head: true }),
      ])
      setNodeCount(nodes.count ?? 0)
      setEdgeCount(edges.count ?? 0)
    }
    fetchCounts()
  }, [])

  return (
    <header
      className="flex items-center shrink-0 px-6"
      style={{
        height: 50,
        background: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* View title */}
      <span className="font-display text-[15px] font-bold text-text-primary">
        {viewTitle}
      </span>

      {/* Center — Search bar */}
      <div className="flex-1 flex justify-center px-6">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 cursor-pointer font-body"
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '7px 12px',
            fontSize: 12,
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            color: 'var(--color-text-placeholder)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(214,58,0,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }}
        >
          <Search size={14} style={{ flexShrink: 0 }} />
          <span className="flex-1" style={{ textAlign: 'left' }}>
            Search graph…
          </span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <span className="font-body text-[12px] text-text-secondary" style={{ whiteSpace: 'nowrap' }}>
          {nodeCount.toLocaleString()} nodes · {edgeCount.toLocaleString()} edges
        </span>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings"
          className="flex items-center justify-center border-none cursor-pointer"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-300))',
            color: '#ffffff',
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {initial}
        </button>
      </div>
    </header>
  )
}
