import { useState, useCallback, useRef } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { AdvancedOptions } from './AdvancedOptions'
import { Sparkles } from 'lucide-react'
import type { ExtractionConfig } from '../../types/extraction'
import type { MeetingSource } from '../../types/ingest'

interface MeetingTranscriptFormProps {
  onExtract: (meeting: MeetingSource, config: ExtractionConfig) => void
  disabled?: boolean
}

export function MeetingTranscriptForm({ onExtract, disabled }: MeetingTranscriptFormProps) {
  const { profile, extractionSettings, anchors } = useSettings()

  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [participants, setParticipants] = useState('')
  const [transcript, setTranscript] = useState('')
  const [mode, setMode] = useState<ExtractionConfig['mode']>(
    extractionSettings?.default_mode ?? 'actionable'
  )
  const [emphasis, setEmphasis] = useState<ExtractionConfig['anchorEmphasis']>(
    extractionSettings?.default_anchor_emphasis ?? 'standard'
  )
  const [selectedAnchorIds, setSelectedAnchorIds] = useState<string[]>([])
  const [customGuidance, setCustomGuidance] = useState('')
  const transcriptRef = useRef<HTMLTextAreaElement>(null)

  const handleTranscriptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 600) + 'px'
  }, [])

  const handleSubmit = useCallback(() => {
    if (!title.trim() || !transcript.trim() || disabled) return

    const config: ExtractionConfig = {
      mode,
      anchorEmphasis: emphasis,
      anchors: anchors
        .filter(a => selectedAnchorIds.includes(a.id))
        .map(a => ({
          label: a.label,
          entity_type: a.entity_type,
          description: a.description ?? '',
        })),
      userProfile: profile,
      customGuidance: customGuidance || undefined,
    }

    onExtract(
      {
        title: title.trim(),
        transcript: transcript.trim(),
        meeting_date: meetingDate || new Date().toISOString().split('T')[0] || '',
        participants: participants.trim(),
      },
      config
    )
  }, [title, transcript, meetingDate, participants, mode, emphasis, anchors, selectedAnchorIds, profile, customGuidance, disabled, onExtract])

  const isEmpty = !title.trim() || !transcript.trim()

  return (
    <div>
      {/* Form Card */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '16px 22px',
        }}
      >
        {/* Title + Date row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label
              className="font-display font-bold"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--color-text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Meeting Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., InfoCert Partnership Call"
              className="font-body w-full"
              style={{
                fontSize: 13,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ width: 160 }}>
            <label
              className="font-display font-bold"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: 'var(--color-text-secondary)',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Date
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="font-body w-full"
              style={{
                fontSize: 12,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--color-bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Participants */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={participants}
            onChange={e => setParticipants(e.target.value)}
            placeholder="e.g., Marco Bellini, Sarah Chen"
            className="font-body w-full"
            style={{
              fontSize: 12,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Transcript */}
        <textarea
          ref={transcriptRef}
          value={transcript}
          onChange={handleTranscriptChange}
          placeholder="Paste your meeting transcript here..."
          className="font-body w-full resize-none"
          style={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            outline: 'none',
            padding: '12px 14px',
            minHeight: 200,
            maxHeight: 600,
          }}
        />

        {/* Extract button */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isEmpty || disabled}
            className="font-body font-semibold cursor-pointer flex items-center gap-2"
            style={{
              fontSize: 13,
              padding: '12px 24px',
              borderRadius: 8,
              background: 'var(--color-accent-500)',
              border: 'none',
              color: 'white',
              opacity: isEmpty || disabled ? 0.4 : 1,
              cursor: isEmpty || disabled ? 'not-allowed' : 'pointer',
              boxShadow: isEmpty || disabled ? 'none' : '0 2px 8px rgba(214,58,0,0.2)',
              transition: 'opacity 0.15s ease',
            }}
          >
            <Sparkles size={14} />
            Extract Meeting
          </button>
        </div>
      </div>

      {/* Advanced Options */}
      <AdvancedOptions
        mode={mode}
        onModeChange={setMode}
        emphasis={emphasis}
        onEmphasisChange={setEmphasis}
        selectedAnchorIds={selectedAnchorIds}
        onAnchorIdsChange={setSelectedAnchorIds}
        customGuidance={customGuidance}
        onGuidanceChange={setCustomGuidance}
      />
    </div>
  )
}
