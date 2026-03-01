import { useState, useCallback } from 'react'
import { List, LayoutGrid } from 'lucide-react'
import { BrowseTab } from './explore/BrowseTab'
import { GraphTab } from '../components/explore/GraphTab'
import { ToggleGroup } from '../components/shared/ToggleGroup'

type Tab = 'graph' | 'browse'
type ViewMode = 'table' | 'cards'

const TAB_OPTIONS: { key: Tab; label: string }[] = [
  { key: 'graph', label: 'Graph' },
  { key: 'browse', label: 'Browse' },
]

export function ExploreView() {
  const [activeTab, setActiveTab] = useState<Tab>('graph')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [totalCount, setTotalCount] = useState(0)

  const handleTotalCountChange = useCallback((count: number) => {
    setTotalCount(count)
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-content)' }}>
      {/* Tab bar */}
      <div
        className="flex items-center shrink-0 gap-4"
        style={{ padding: '12px 16px' }}
      >
        <ToggleGroup
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={setActiveTab}
          style={{ minWidth: 240 }}
        />

        {/* Result count */}
        {activeTab === 'browse' && totalCount > 0 && (
          <span className="font-body text-[11px] text-text-secondary">
            {totalCount.toLocaleString()} entities
          </span>
        )}

        <div className="flex-1" />

        {/* View toggle — Browse only */}
        {activeTab === 'browse' && (
          <div
            className="flex items-center rounded-lg p-0.5"
            style={{ background: 'var(--color-bg-inset)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer"
              style={{
                background: viewMode === 'table' ? 'var(--color-bg-card)' : 'transparent',
                border: 'none',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
              aria-label="Table view"
              title="Table view"
            >
              <List
                size={14}
                style={{ color: viewMode === 'table' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
              />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer"
              style={{
                background: viewMode === 'cards' ? 'var(--color-bg-card)' : 'transparent',
                border: 'none',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid
                size={14}
                style={{ color: viewMode === 'cards' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
              />
            </button>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'graph' && <GraphTab />}
        {activeTab === 'browse' && (
          <BrowseTab
            viewMode={viewMode}
            onTotalCountChange={handleTotalCountChange}
          />
        )}
      </div>
    </div>
  )
}
