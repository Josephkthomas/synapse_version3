import { Calendar, Plus } from 'lucide-react'
import { BriefingCard } from './BriefingCard'
import type { DigestProfile } from '../../types/feed'

interface BriefingsTabProps {
  profiles: DigestProfile[]
  loading: boolean
  tableExists: boolean
}

export function BriefingsTab({ profiles, loading, tableExists }: BriefingsTabProps) {
  // Placeholder: Digests tab in Settings is built in PRD 13
  const handleConfigureClick = () => {
    console.info('Configure Digests: available after PRD 13 is implemented')
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[100, 85].map((h, i) => (
          <div
            key={i}
            className="rounded-[12px] animate-pulse"
            style={{
              height: h,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
          />
        ))}
      </div>
    )
  }

  if (!tableExists || profiles.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ paddingTop: 48, textAlign: 'center' }}
      >
        <Calendar
          size={32}
          style={{ color: 'var(--color-text-placeholder)', marginBottom: 12 }}
        />
        <p
          className="font-body font-semibold"
          style={{ fontSize: 14, color: 'var(--color-text-body)', marginBottom: 4 }}
        >
          Intelligence Briefings
        </p>
        <p
          className="font-body"
          style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 320 }}
        >
          Set up automated digests that synthesize your knowledge graph into actionable briefings.
        </p>
        <button
          type="button"
          onClick={handleConfigureClick}
          className="font-body font-semibold cursor-pointer rounded-md"
          style={{
            fontSize: 12,
            padding: '7px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
            marginTop: 16,
          }}
        >
          Configure
        </button>
      </div>
    )
  }

  return (
    <div>
      {profiles.map(profile => (
        <BriefingCard key={profile.id} profile={profile} />
      ))}

      {/* Configure New Digest */}
      <button
        type="button"
        onClick={handleConfigureClick}
        className="w-full cursor-pointer flex flex-col items-center justify-center rounded-[12px]"
        style={{
          border: '2px dashed var(--border-default)',
          padding: '16px 24px',
          background: 'none',
          marginTop: 8,
        }}
      >
        <Plus
          size={20}
          style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}
        />
        <span
          className="font-body"
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}
        >
          Configure New Digest
        </span>
      </button>
    </div>
  )
}
