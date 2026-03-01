import { Calendar, Plus } from 'lucide-react'
import { BriefingCard } from './BriefingCard'
import type { DigestProfile } from '../../types/feed'

interface BriefingsTabProps {
  profiles: DigestProfile[]
  loading: boolean
  tableExists: boolean
  generatingProfileId?: string | null
  onCreateNew: () => void
  onViewProfile: (profileId: string) => void
  onGenerateNow: (profileId: string) => void
}

export function BriefingsTab({
  profiles,
  loading,
  tableExists,
  generatingProfileId,
  onCreateNew,
  onViewProfile,
  onGenerateNow,
}: BriefingsTabProps) {
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
          onClick={onCreateNew}
          className="font-body font-semibold cursor-pointer rounded-md"
          style={{
            fontSize: 12,
            padding: '7px 14px',
            background: 'var(--color-accent-500)',
            border: 'none',
            color: '#fff',
            marginTop: 16,
          }}
        >
          Configure First Digest
        </button>
      </div>
    )
  }

  return (
    <div>
      {profiles.map(profile => (
        <BriefingCard
          key={profile.id}
          profile={profile}
          onView={() => onViewProfile(profile.id)}
          onGenerateNow={() => onGenerateNow(profile.id)}
          generating={generatingProfileId === profile.id}
        />
      ))}

      {/* Configure New Digest */}
      <button
        type="button"
        onClick={onCreateNew}
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
