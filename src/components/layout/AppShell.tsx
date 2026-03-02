import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavRail } from './NavRail'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'
import { CommandPalette } from '../modals/CommandPalette'
import { SettingsModal } from '../modals/SettingsModal'
import { useGraphContext } from '../../hooks/useGraphContext'

export function AppShell() {
  const location = useLocation()
  const { rightPanelContent } = useGraphContext()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isAskView = location.pathname === '/ask'
  const showRightPanel = isAskView || rightPanelContent !== null

  // Global keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <div className="flex w-full h-screen overflow-hidden" style={{ background: 'var(--color-bg-content)' }}>
        <NavRail
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
          <TopBar
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        </main>

        {showRightPanel && <RightPanel />}
      </div>

      {commandPaletteOpen && (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onOpenSettings={() => { setCommandPaletteOpen(false); setSettingsOpen(true) }}
        />
      )}

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </>
  )
}
