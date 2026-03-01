import { useState } from 'react'
import { Sparkles, Pencil, Trash2, Loader2, Play, Mail, MessageCircle, Slack } from 'lucide-react'
import { useDigestProfiles } from '../../hooks/useDigestProfiles'
import { DigestProfileEditor } from './DigestProfileEditor'
import { DigestViewer } from '../home/DigestViewer'
import { generateDigest } from '../../services/digestEngine'
import { saveDigestHistory } from '../../services/supabase'
import { supabase } from '../../services/supabase'
import type { DigestProfile } from '../../types/feed'
import type { DigestOutput, DigestHistoryEntry } from '../../types/digest'

function FrequencyBadge({ frequency }: { frequency: string }) {
  return (
    <span
      className="font-body font-bold uppercase"
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 20,
        background: 'var(--color-bg-inset)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.06em',
      }}
    >
      {frequency}
    </span>
  )
}

function ChannelIcons({ channels }: { channels: string[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {channels.includes('email') && <Mail size={12} style={{ color: 'var(--color-text-secondary)' }} />}
      {channels.includes('telegram') && <MessageCircle size={12} style={{ color: 'var(--color-text-secondary)' }} />}
      {channels.includes('slack') && <Slack size={12} style={{ color: 'var(--color-text-secondary)' }} />}
    </div>
  )
}

function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onPreview,
  previewing,
}: {
  profile: DigestProfile
  onEdit: () => void
  onDelete: () => void
  onPreview: () => void
  previewing: boolean
}) {
  const activeModules = profile.modules
    .filter(m => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div
      style={{
        background: 'var(--color-bg-frame)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '14px 18px',
      }}
    >
      {/* Row 1: title + frequency + active badge */}
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <span
          className="font-body font-semibold flex-1 truncate"
          style={{ fontSize: 14, color: 'var(--color-text-primary)' }}
        >
          {profile.title}
        </span>
        <FrequencyBadge frequency={profile.frequency} />
        <span
          className="font-body font-bold uppercase"
          style={{
            fontSize: 9,
            padding: '2px 7px',
            borderRadius: 20,
            background: profile.isActive ? 'rgba(5,150,105,0.10)' : 'var(--color-bg-inset)',
            border: `1px solid ${profile.isActive ? 'rgba(5,150,105,0.25)' : 'var(--border-subtle)'}`,
            color: profile.isActive ? '#059669' : 'var(--color-text-secondary)',
            letterSpacing: '0.06em',
          }}
        >
          {profile.isActive ? 'active' : 'paused'}
        </span>
      </div>

      {/* Row 2: schedule */}
      <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
        {profile.scheduleTime.substring(0, 5)} · {profile.scheduleTimezone} · {profile.density}
      </p>

      {/* Row 3: module tags */}
      {activeModules.length > 0 && (
        <div className="flex flex-wrap gap-1" style={{ marginBottom: 10 }}>
          {activeModules.map(m => (
            <span
              key={m.id}
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-inset)',
                padding: '2px 7px',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {m.templateId.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: channel icons + actions */}
      <div className="flex items-center gap-2">
        <ChannelIcons channels={[]} />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onPreview}
          disabled={previewing}
          className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
          style={{
            fontSize: 11,
            padding: '5px 10px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-body)',
            cursor: previewing ? 'not-allowed' : 'pointer',
          }}
        >
          {previewing
            ? <Loader2 size={11} className="animate-spin" />
            : <Play size={11} />}
          {previewing ? 'Generating…' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
          style={{
            fontSize: 11,
            padding: '5px 10px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-body)',
          }}
        >
          <Pencil size={11} /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1 font-body cursor-pointer rounded-md"
          style={{
            fontSize: 11,
            padding: '5px 8px',
            background: 'none',
            border: '1px solid transparent',
            color: 'var(--color-text-secondary)',
          }}
          title="Delete digest"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export function DigestsTab() {
  const { profiles, loading, remove, refresh } = useDigestProfiles()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<DigestProfile | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Preview state
  const [previewingProfileId, setPreviewingProfileId] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerProfile, setViewerProfile] = useState<DigestProfile | null>(null)
  const [viewerOutput, setViewerOutput] = useState<DigestOutput | null>(null)
  const [viewerEntry, setViewerEntry] = useState<DigestHistoryEntry | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number; name: string } | null>(null)

  const handleEdit = (profile: DigestProfile) => {
    setEditingProfile(profile)
    setEditorOpen(true)
  }

  const handleDelete = async (profileId: string) => {
    setDeleting(true)
    try {
      await remove(profileId)
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  const handlePreview = async (profile: DigestProfile) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setViewerProfile(profile)
    setViewerOutput(null)
    setViewerEntry(null)
    setGenerating(true)
    setGenerationProgress(null)
    setPreviewingProfileId(profile.id)
    setViewerOpen(true)

    try {
      const output = await generateDigest(profile, user.id, {
        onModuleProgress: (current, total, name) => {
          setGenerationProgress({ current, total, name })
        },
      })
      setViewerOutput(output)

      // Save to history
      try {
        await saveDigestHistory({
          digest_profile_id: profile.id,
          user_id: user.id,
          generated_at: output.generatedAt,
          content: output,
          module_outputs: output.modules,
          executive_summary: output.executiveSummary,
          density: profile.density,
          generation_duration_ms: output.totalDurationMs,
          status: 'generated',
          delivery_results: [],
        })
        refresh()
      } catch {
        // Non-critical — digest shown even if history save fails
      }
    } catch (err) {
      console.warn('Digest preview failed:', err)
    } finally {
      setGenerating(false)
      setPreviewingProfileId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: 200 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-secondary)' }} />
      </div>
    )
  }

  return (
    <>
      {profiles.length === 0 ? (
        <div className="flex flex-col items-center gap-4" style={{ paddingTop: 48 }}>
          <Sparkles size={28} strokeWidth={1.4} style={{ color: 'var(--color-text-placeholder)' }} />
          <div className="text-center">
            <p className="font-body font-semibold" style={{ fontSize: 13, color: 'var(--color-text-body)', marginBottom: 4 }}>
              Intelligence Digests
            </p>
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 280, lineHeight: 1.5 }}>
              Create automated briefings from your knowledge graph. Choose modules, set a schedule, and get proactive intelligence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingProfile(undefined); setEditorOpen(true) }}
            className="font-body font-semibold cursor-pointer rounded-md"
            style={{
              fontSize: 12,
              padding: '7px 14px',
              background: 'var(--color-accent-500)',
              border: 'none',
              color: '#fff',
            }}
          >
            Create Your First Digest
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Automated intelligence briefings from your knowledge graph.
            </p>
            <button
              type="button"
              onClick={() => { setEditingProfile(undefined); setEditorOpen(true) }}
              className="font-body font-semibold cursor-pointer rounded-md"
              style={{
                fontSize: 11,
                padding: '5px 12px',
                background: 'var(--color-accent-500)',
                border: 'none',
                color: '#fff',
              }}
            >
              + New Digest
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => handleEdit(profile)}
                onDelete={() => setConfirmDeleteId(profile.id)}
                onPreview={() => handlePreview(profile)}
                previewing={previewingProfileId === profile.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8,
          }}
        >
          <p className="font-body" style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>
            Delete this digest? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDelete(confirmDeleteId)}
              disabled={deleting}
              className="font-body font-semibold cursor-pointer rounded-md"
              style={{
                fontSize: 11,
                padding: '5px 12px',
                background: '#ef4444',
                border: 'none',
                color: '#fff',
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="font-body cursor-pointer rounded-md"
              style={{
                fontSize: 11,
                padding: '5px 12px',
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--color-text-body)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <DigestProfileEditor
          profile={editingProfile}
          onClose={() => { setEditorOpen(false); setEditingProfile(undefined) }}
          onSaved={(_id) => { setEditorOpen(false); setEditingProfile(undefined) }}
        />
      )}

      {/* Preview viewer */}
      {viewerOpen && viewerProfile && (
        <DigestViewer
          profile={viewerProfile}
          output={viewerOutput ?? undefined}
          entry={viewerEntry ?? undefined}
          generating={generating}
          generationProgress={generationProgress ?? undefined}
          onClose={() => { setViewerOpen(false); setViewerOutput(null); setViewerEntry(null); setViewerProfile(null) }}
          onRegenerate={() => handlePreview(viewerProfile)}
        />
      )}
    </>
  )
}
