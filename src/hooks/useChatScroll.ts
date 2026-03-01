import { useRef, useCallback, useEffect, useState } from 'react'

export interface UseChatScrollReturn {
  scrollRef: React.MutableRefObject<HTMLDivElement | null>
  bottomRef: React.MutableRefObject<HTMLDivElement | null>
  showScrollPill: boolean
  scrollToBottom: () => void
  onScroll: () => void
}

export function useChatScroll(messageCount: number): UseChatScrollReturn {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollPill, setShowScrollPill] = useState(false)
  const userScrolledUpRef = useRef(false)
  const prevMessageCountRef = useRef(messageCount)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
    userScrolledUpRef.current = false
    setShowScrollPill(false)
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isScrolledUp = distanceFromBottom > 100
    userScrolledUpRef.current = isScrolledUp
    if (!isScrolledUp) setShowScrollPill(false)
  }, [])

  useEffect(() => {
    if (messageCount === prevMessageCountRef.current) return
    prevMessageCountRef.current = messageCount

    if (userScrolledUpRef.current) {
      // User has scrolled up — show pill instead of auto-scrolling
      setShowScrollPill(true)
    } else {
      scrollToBottom('smooth')
    }
  }, [messageCount, scrollToBottom])

  return { scrollRef, bottomRef, showScrollPill, scrollToBottom, onScroll }
}
