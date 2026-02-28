const SOURCE_EMOJI: Record<string, string> = {
  Meeting: '🎙',
  YouTube: '▶️',
  Research: '📖',
  Note: '📝',
  Document: '📄',
}

interface SourceIconProps {
  sourceType: string | null | undefined
  size?: number
}

export function SourceIcon({ sourceType, size = 22 }: SourceIconProps) {
  const emoji = sourceType ? (SOURCE_EMOJI[sourceType] ?? '📄') : '📄'

  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-md"
      style={{
        width: size,
        height: size,
        background: 'var(--color-bg-inset)',
        fontSize: size * 0.6,
      }}
    >
      {emoji}
    </span>
  )
}

export function getSourceEmoji(sourceType: string | null | undefined): string {
  return sourceType ? (SOURCE_EMOJI[sourceType] ?? '📄') : '📄'
}
