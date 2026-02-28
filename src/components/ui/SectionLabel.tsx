interface SectionLabelProps {
  children: React.ReactNode
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <span className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-text-secondary">
      {children}
    </span>
  )
}
