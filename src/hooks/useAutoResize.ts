import { useEffect, useRef } from 'react'

export function useAutoResize(
  value: string,
  minHeight = 80,
  maxHeight = 240,
) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const scrollHeight = el.scrollHeight
    const clamped = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
    el.style.height = `${clamped}px`
    el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value, minHeight, maxHeight])

  return ref
}
