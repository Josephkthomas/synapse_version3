const STEPS = ['queued', 'fetching_transcript', 'transcript_ready', 'extracting', 'saving']

interface HistoryCardStepBarProps {
  currentStep: string
}

export function HistoryCardStepBar({ currentStep }: HistoryCardStepBarProps) {
  const currentIdx = STEPS.indexOf(currentStep)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Step segments */}
      <div style={{ display: 'flex', gap: 2, width: 80 }}>
        {STEPS.map((step, i) => {
          const isFilled = i < currentIdx
          const isCurrent = i === currentIdx

          return (
            <div
              key={step}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: isFilled || isCurrent
                  ? 'var(--color-accent-500)'
                  : 'var(--color-bg-active, #e5e7eb)',
                animation: isCurrent ? 'pulse 1.5s infinite' : undefined,
                opacity: isCurrent ? undefined : 1,
              }}
            />
          )
        })}
      </div>

      {/* Step label */}
      <span
        className="font-body"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-accent-500)',
          textTransform: 'capitalize',
        }}
      >
        {currentStep.replace(/_/g, ' ')}
      </span>
    </div>
  )
}
