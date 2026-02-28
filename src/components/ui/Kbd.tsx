interface KbdProps {
  children: React.ReactNode
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="inline-flex items-center rounded bg-bg-inset border border-border-subtle text-text-secondary font-body text-[10px] px-1.5 py-0.5">
      {children}
    </kbd>
  )
}
