interface ConfidenceSliderProps {
  value: number
  onChange: (value: number) => void
}

export function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-body text-[10px] font-semibold text-text-secondary whitespace-nowrap">
        Conf ≥
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="confidence-slider"
        style={{
          width: 80,
          height: 4,
          cursor: 'pointer',
          appearance: 'none',
          background: `linear-gradient(to right, var(--color-accent-500) ${value}%, var(--color-bg-inset) ${value}%)`,
          borderRadius: '2px',
          outline: 'none',
          border: 'none',
        }}
      />
      <span className="font-body text-[11px] text-text-secondary w-8 text-right">
        {value}%
      </span>
    </div>
  )
}
