import {
  Save, AlignLeft, FileText, Sparkles, Eye, Database, Cpu, Scissors, Zap, Check, X,
} from 'lucide-react'
import type { ExtractionStep } from '../../types/extraction'

interface ExtractionProgressProps {
  step: ExtractionStep
  statusText: string
  elapsedMs: number
  embeddingProgress: { completed: number; total: number } | null
  error: Error | null
  onRetry?: () => void
  onCancel?: () => void
}

const PIPELINE_STEPS = [
  { key: 'saving_source', label: 'Saving source', Icon: Save },
  { key: 'summarizing', label: 'Summarizing', Icon: AlignLeft },
  { key: 'composing_prompt', label: 'Composing prompt', Icon: FileText },
  { key: 'extracting', label: 'Extracting entities', Icon: Sparkles },
  { key: 'reviewing', label: 'Reviewing', Icon: Eye },
  { key: 'saving_nodes', label: 'Saving to graph', Icon: Database },
  { key: 'generating_embeddings', label: 'Generating embeddings', Icon: Cpu },
  { key: 'chunking_source', label: 'Chunking source', Icon: Scissors },
  { key: 'discovering_connections', label: 'Discovering connections', Icon: Zap },
] as const

const STEP_ORDER = PIPELINE_STEPS.map(s => s.key)

function getStepIndex(step: ExtractionStep): number {
  const idx = STEP_ORDER.indexOf(step as typeof STEP_ORDER[number])
  return idx >= 0 ? idx : -1
}

export function ExtractionProgress({
  step,
  statusText,
  elapsedMs,
  error: _error,
  onRetry,
  onCancel,
}: ExtractionProgressProps) {
  const currentIdx = getStepIndex(step)
  const isError = step === 'error'

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${String(sec).padStart(2, '0')}`
  }

  return (
    <>
      <style>{`
        @keyframes stepPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        {/* Step Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {PIPELINE_STEPS.map((pipeStep, i) => {
            const stepIdx = i
            let state: 'pending' | 'active' | 'completed' | 'failed' = 'pending'

            if (isError && stepIdx === currentIdx) {
              state = 'failed'
            } else if (stepIdx < currentIdx || step === 'complete') {
              state = 'completed'
            } else if (stepIdx === currentIdx) {
              state = 'active'
            }

            const IconComponent = pipeStep.Icon

            return (
              <div key={pipeStep.key} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STEPS.length - 1 ? 1 : 'none' }}>
                {/* Step Circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        state === 'completed' ? 'var(--color-semantic-green-500)'
                        : state === 'active' ? 'var(--color-accent-500)'
                        : state === 'failed' ? 'var(--color-semantic-red-500)'
                        : 'var(--color-bg-inset)',
                      border: state === 'pending' ? '1px solid var(--border-subtle)' : 'none',
                      animation: state === 'active' ? 'stepPulse 1.5s infinite' : 'none',
                      transition: 'background 0.3s ease',
                    }}
                  >
                    {state === 'completed' ? (
                      <Check size={12} color="white" strokeWidth={3} />
                    ) : state === 'failed' ? (
                      <X size={12} color="white" strokeWidth={3} />
                    ) : (
                      <IconComponent
                        size={11}
                        color={state === 'active' ? 'white' : 'var(--color-text-placeholder)'}
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <span
                    className="font-body"
                    style={{
                      fontSize: 10,
                      fontWeight: state === 'active' || state === 'failed' ? 600 : 500,
                      color:
                        state === 'active' ? 'var(--color-accent-500)'
                        : state === 'failed' ? 'var(--color-semantic-red-500)'
                        : state === 'completed' ? 'var(--color-text-body)'
                        : 'var(--color-text-secondary)',
                      marginTop: 6,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pipeStep.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      marginBottom: 20, // offset for the label
                      background:
                        stepIdx < currentIdx || step === 'complete'
                          ? 'var(--color-semantic-green-500)'
                          : stepIdx === currentIdx
                            ? 'var(--color-accent-500)'
                            : 'var(--border-subtle)',
                      transition: 'background 0.3s ease',
                      minWidth: 8,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Status Text + Elapsed Time */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <span
            className="font-body"
            style={{
              fontSize: 13,
              color: isError ? 'var(--color-semantic-red-500)' : 'var(--color-text-body)',
            }}
          >
            {statusText}
          </span>
          <span
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
            }}
          >
            {formatTime(elapsedMs)}
          </span>
        </div>

        {/* Error Actions */}
        {isError && (onRetry || onCancel) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 12,
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: 'var(--color-bg-inset)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--color-text-body)',
                }}
              >
                Retry
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 12,
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
