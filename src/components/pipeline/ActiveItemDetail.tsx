import { X, Clock, Loader2, Check, CircleDashed, Play } from 'lucide-react'
import { getSourceConfig } from '../../config/sourceTypes'
import type { PipelineHistoryItem } from '../../types/pipeline'

interface ActiveItemDetailProps {
  item: PipelineHistoryItem
  onClose: () => void
  onProcessNow?: () => void
  processingNow?: boolean
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const PIPELINE_STAGES = [
  {
    id: 'queued',
    label: 'Queued',
    description: 'Waiting in the pipeline queue for processing',
  },
  {
    id: 'fetching_transcript',
    label: 'Fetching Content',
    description: 'Downloading and parsing the source content',
  },
  {
    id: 'transcript_ready',
    label: 'Transcript Ready',
    description: 'Content fetched, waiting for extraction slot',
  },
  {
    id: 'extracting',
    label: 'Extracting Entities',
    description: 'AI is identifying entities, relationships, and insights',
  },
  {
    id: 'saving',
    label: 'Saving to Graph',
    description: 'Persisting extracted knowledge and creating connections',
  },
]

function getStageStatus(stageId: string, currentStep: string | undefined): 'done' | 'active' | 'pending' {
  if (!currentStep) return stageId === 'queued' ? 'active' : 'pending'

  const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === currentStep)
  const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === stageId)

  if (stageIdx < currentIdx) return 'done'
  if (stageIdx === currentIdx) return 'active'
  return 'pending'
}

export function ActiveItemDetail({ item, onClose, onProcessNow, processingNow }: ActiveItemDetailProps) {
  const sourceConfig = getSourceConfig(item.sourceType)
  // When processingNow is true, show optimistic "in progress" even if DB still says pending
  const isOptimisticProcessing = !!processingNow && item.status === 'pending'
  const isQueued = item.status === 'pending' && !isOptimisticProcessing
  const effectiveStep = isOptimisticProcessing ? 'fetching_transcript' : item.step
  const elapsedMs = Date.now() - new Date(item.createdAt).getTime()
  const elapsedSec = Math.floor(elapsedMs / 1000)
  const elapsedDisplay = elapsedSec < 60
    ? `${elapsedSec}s`
    : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`

  // Count completed stages for progress
  const completedStages = PIPELINE_STAGES.filter(s => getStageStatus(s.id, effectiveStep) === 'done').length
  const progressPct = Math.round((completedStages / PIPELINE_STAGES.length) * 100)

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 20px',
        animation: 'slideInRight 0.2s ease',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pipelinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${sourceConfig.color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {sourceConfig.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            className="font-display"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </h2>
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {item.sourceType} · {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
        >
          <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      {/* Status badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 20,
          background: isQueued ? 'var(--color-bg-inset)' : 'var(--color-accent-50)',
          border: `1px solid ${isQueued ? 'var(--border-subtle)' : 'rgba(214,58,0,0.15)'}`,
          marginBottom: 20,
        }}
      >
        {isQueued ? (
          <Clock size={12} style={{ color: 'var(--color-text-secondary)' }} />
        ) : (
          <Loader2 size={12} style={{ color: 'var(--color-accent-500)', animation: 'spin 1s linear infinite' }} />
        )}
        <span
          className="font-body"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isQueued ? 'var(--color-text-secondary)' : 'var(--color-accent-600, #c2410c)',
          }}
        >
          {isQueued ? 'Queued' : isOptimisticProcessing ? 'Starting...' : 'In Progress'}
        </span>
      </div>

      {/* Process Now button (for queued and transcript_ready items, hidden once processing starts) */}
      {!processingNow && (isQueued || item.step === 'transcript_ready') && onProcessNow && (
        <button
          type="button"
          onClick={onProcessNow}
          disabled={processingNow}
          className="font-body font-semibold cursor-pointer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 12,
            background: processingNow ? 'var(--color-bg-inset)' : 'var(--color-accent-500)',
            border: 'none',
            color: processingNow ? 'var(--color-text-secondary)' : 'white',
            marginBottom: 20,
            transition: 'all 0.15s ease',
            opacity: processingNow ? 0.7 : 1,
          }}
        >
          {processingNow ? (
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Play size={13} style={{ fill: 'currentColor' }} />
          )}
          {processingNow ? 'Processing...' : 'Process Now'}
        </button>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>
            Progress
          </span>
          <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {completedStages}/{PIPELINE_STAGES.length}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-inset)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              borderRadius: 3,
              background: 'var(--color-accent-500)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Pipeline stages */}
      <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 12 }}>
        Pipeline Stages
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const status = getStageStatus(stage.id, effectiveStep)
          const isLast = i === PIPELINE_STAGES.length - 1

          return (
            <div key={stage.id} style={{ display: 'flex', gap: 12 }}>
              {/* Timeline column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                {/* Icon */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: status === 'done'
                      ? 'var(--color-accent-500)'
                      : status === 'active'
                        ? 'var(--color-accent-50)'
                        : 'var(--color-bg-inset)',
                    border: status === 'active'
                      ? '2px solid var(--color-accent-500)'
                      : status === 'done'
                        ? 'none'
                        : '1px solid var(--border-subtle)',
                    flexShrink: 0,
                  }}
                >
                  {status === 'done' && (
                    <Check size={12} style={{ color: 'white' }} />
                  )}
                  {status === 'active' && (
                    <Loader2
                      size={12}
                      style={{
                        color: 'var(--color-accent-500)',
                        animation: isQueued ? undefined : 'spin 1s linear infinite',
                      }}
                    />
                  )}
                  {status === 'pending' && (
                    <CircleDashed size={12} style={{ color: 'var(--color-text-placeholder)' }} />
                  )}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 16,
                      background: status === 'done'
                        ? 'var(--color-accent-400, #ea580c)'
                        : 'var(--border-subtle)',
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div
                  className="font-body"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: status === 'pending' ? 'var(--color-text-placeholder)' : 'var(--color-text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {stage.label}
                  {status === 'active' && !isQueued && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontWeight: 500,
                        color: 'var(--color-accent-500)',
                        animation: 'pipelinePulse 1.5s ease infinite',
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div
                  className="font-body"
                  style={{
                    fontSize: 11,
                    color: status === 'pending' ? 'var(--color-text-placeholder)' : 'var(--color-text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {stage.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 20, paddingTop: 16 }}>
        <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 10 }}>
          Details
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Elapsed
            </span>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-body)' }}>
              {elapsedDisplay}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Mode
            </span>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-body)', textTransform: 'capitalize' }}>
              {item.mode}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Emphasis
            </span>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-body)', textTransform: 'capitalize' }}>
              {item.emphasis}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Source Type
            </span>
            <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-body)' }}>
              {item.sourceType}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
