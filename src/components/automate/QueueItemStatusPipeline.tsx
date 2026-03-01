import { X } from 'lucide-react'
import type { QueueItem } from '../../types/automate'

interface QueueItemStatusPipelineProps {
  item: QueueItem
}

const STEPS = [
  { label: 'Queued', step: 1 },
  { label: 'Fetching Transcript', step: 2 },
  { label: 'Extracting Entities', step: 3 },
  { label: 'Saving to Graph', step: 4 },
  { label: 'Complete', step: 5 },
]

function getActiveStep(status: string): number {
  switch (status) {
    case 'pending': return 1
    case 'fetching_transcript': return 2
    case 'extracting': return 3
    case 'completed': return 5
    case 'failed': return -1
    case 'skipped': return 0
    default: return 0
  }
}

function getFailedStep(item: QueueItem): number {
  if (!item.transcript) return 2
  if (item.nodes_created === 0) return 3
  return 4
}

export function QueueItemStatusPipeline({ item }: QueueItemStatusPipelineProps) {
  const activeStep = getActiveStep(item.status)
  const failedStep = item.status === 'failed' ? getFailedStep(item) : -1

  // Check if stalled (>10min in processing state)
  const isStalled = (() => {
    if (!item.started_at) return false
    if (item.status !== 'fetching_transcript' && item.status !== 'extracting') return false
    return Date.now() - new Date(item.started_at).getTime() > 10 * 60 * 1000
  })()

  return (
    <div className="flex items-center" style={{ width: '100%', padding: '8px 0' }}>
      {STEPS.map((step, idx) => {
        const isCompleted = activeStep >= step.step || (activeStep === 5 && step.step <= 5)
        const isActive = activeStep === step.step
        const isFailed = failedStep === step.step
        const isPending = !isCompleted && !isActive && !isFailed

        let circleColor = 'var(--border-default)'
        let circleFill = 'transparent'
        let labelColor = 'var(--color-text-secondary)'

        if (isCompleted && !isActive) {
          circleColor = '#10b981'
          circleFill = '#10b981'
        }
        if (isActive) {
          circleColor = isStalled ? '#f59e0b' : 'var(--color-accent-500)'
          circleFill = isStalled ? '#f59e0b' : 'var(--color-accent-500)'
          labelColor = isStalled ? '#f59e0b' : 'var(--color-accent-500)'
        }
        if (isFailed) {
          circleColor = '#ef4444'
          circleFill = '#ef4444'
          labelColor = '#ef4444'
        }

        // Connector line color
        let lineColor = 'var(--border-subtle)'
        if (idx > 0) {
          const prevCompleted = activeStep >= STEPS[idx - 1]!.step
          if (prevCompleted && !isFailed) lineColor = '#86efac'
          if (isFailed) lineColor = '#fca5a5'
        }

        return (
          <div
            key={step.step}
            className="flex flex-col items-center"
            style={{ flex: 1, position: 'relative' }}
          >
            {/* Connector + Circle row */}
            <div className="flex items-center" style={{ width: '100%' }}>
              {/* Left connector */}
              {idx > 0 && (
                <div style={{ flex: 1, height: 2, backgroundColor: lineColor }} />
              )}

              {/* Circle */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: circleFill,
                  border: isPending ? `2px solid ${circleColor}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: isActive && !isStalled ? 'pulse 2s ease-in-out infinite' : undefined,
                }}
              >
                {isFailed && <X size={8} color="white" strokeWidth={2.5} />}
              </div>

              {/* Right connector */}
              {idx < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: isCompleted && !isFailed ? '#86efac' : 'var(--border-subtle)',
                  }}
                />
              )}
            </div>

            {/* Label */}
            <span
              className="font-body"
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: labelColor,
                marginTop: 4,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {isStalled && isActive ? 'May be stalled' : step.label}
            </span>
          </div>
        )
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
