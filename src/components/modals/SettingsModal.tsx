import { useState } from 'react'
import { User, Anchor, Zap, Calendar, Link, X, type LucideIcon } from 'lucide-react'

const SETTINGS_TABS: Array<{ id: string; label: string; icon: LucideIcon; description: string }> = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Manage your profile and processing preferences.' },
  { id: 'anchors', label: 'Anchors', icon: Anchor, description: 'Manage anchor entities that guide extraction and context.' },
  { id: 'extraction', label: 'Extraction', icon: Zap, description: 'Configure default extraction modes and emphasis settings.' },
  { id: 'digests', label: 'Digests', icon: Calendar, description: 'Set up automated intelligence briefings and digests.' },
  { id: 'integrations', label: 'Integrations', icon: Link, description: 'Connect external services and manage API keys.' },
]

interface SettingsModalProps {
  onClose: () => void
}

function ProfileTab() {
  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 480 }}>
      <div>
        <label className="block font-body text-[12px] font-semibold text-text-secondary mb-2">
          Name
        </label>
        <input
          type="text"
          placeholder="Your name"
          className="w-full font-body text-[13px] text-text-primary placeholder:text-text-placeholder outline-none"
          style={{
            padding: '10px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        />
      </div>

      <div>
        <label className="block font-body text-[12px] font-semibold text-text-secondary mb-2">
          Professional Context
        </label>
        <textarea
          placeholder="Your role, industry, and current projects"
          rows={3}
          className="w-full font-body text-[13px] text-text-primary placeholder:text-text-placeholder outline-none resize-none"
          style={{
            padding: '10px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        />
      </div>

      <div>
        <label className="block font-body text-[12px] font-semibold text-text-secondary mb-2">
          Personal Interests
        </label>
        <textarea
          placeholder="Topics and learning goals you care about"
          rows={3}
          className="w-full font-body text-[13px] text-text-primary placeholder:text-text-placeholder outline-none resize-none"
          style={{
            padding: '10px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        />
      </div>

      <div>
        <label className="block font-body text-[12px] font-semibold text-text-secondary mb-2">
          Processing Preferences
        </label>
        <textarea
          placeholder="Preferred insight depth, relationship focus"
          rows={2}
          className="w-full font-body text-[13px] text-text-primary placeholder:text-text-placeholder outline-none resize-none"
          style={{
            padding: '10px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        />
      </div>

      <div className="pt-2">
        <button
          type="button"
          className="font-body text-[13px] font-semibold border-none cursor-pointer"
          style={{
            padding: '10px 28px',
            background: 'var(--color-accent-500)',
            color: '#ffffff',
            borderRadius: 8,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-600)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent-500)'}
        >
          Save
        </button>
      </div>
    </div>
  )
}

function ComingSoonTab({ tab }: { tab: (typeof SETTINGS_TABS)[number] }) {
  const Icon = tab.icon
  return (
    <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 300 }}>
      <div
        className="flex items-center justify-center rounded-xl"
        style={{ width: 56, height: 56, background: 'var(--color-bg-inset)' }}
      >
        <Icon size={24} style={{ color: 'var(--color-text-placeholder)' }} strokeWidth={1.4} />
      </div>
      <div className="text-center max-w-[300px]">
        <p className="font-body text-[13px] text-text-secondary mb-1">
          {tab.description}
        </p>
        <p className="font-body text-[12px] text-text-placeholder">
          Coming in a future update.
        </p>
      </div>
    </div>
  )
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const currentTab = SETTINGS_TABS.find(t => t.id === activeTab)!

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="flex overflow-hidden"
        style={{
          width: 720,
          height: 520,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div
          className="flex flex-col shrink-0"
          style={{
            width: 200,
            background: 'var(--color-bg-frame)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '24px 10px',
          }}
        >
          <span
            className="font-display text-[14px] font-bold text-text-primary mb-5"
            style={{ padding: '0 12px' }}
          >
            Settings
          </span>

          <div className="flex flex-col gap-0.5">
            {SETTINGS_TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2.5 w-full border-none cursor-pointer"
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: isActive ? 'var(--color-bg-active)' : 'transparent',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <Icon
                    size={15}
                    strokeWidth={1.8}
                    style={{
                      color: isActive ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
                    }}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div
            className="flex items-center justify-between shrink-0"
            style={{ padding: '24px 32px 16px' }}
          >
            <h2 className="font-display text-[18px] font-bold text-text-primary">
              {currentTab.label}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 border-none cursor-pointer rounded-lg hover:bg-bg-hover"
              style={{ background: 'transparent' }}
            >
              <X size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ padding: '0 32px 28px' }}>
            {activeTab === 'profile' ? (
              <ProfileTab />
            ) : (
              <ComingSoonTab tab={currentTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
