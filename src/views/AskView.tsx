import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRAGQuery } from '../hooks/useRAGQuery'
import { useChatScroll } from '../hooks/useChatScroll'
import { getGraphStats } from '../services/supabase'
import { StatusBar } from '../components/ask/StatusBar'
import { ChatMessageList } from '../components/ask/ChatMessageList'
import { ChatInput } from '../components/ask/ChatInput'
import { EmptyAskState } from '../components/ask/EmptyAskState'

export function AskView() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { messages, isLoading, pipelineEvents, error, sendMessage } = useRAGQuery()
  const scroll = useChatScroll(messages.length)
  const [graphIsEmpty, setGraphIsEmpty] = useState(false)

  // Capture the auto-query from router state once on mount.
  // We read it into a ref immediately so it survives re-renders.
  const pendingAutoQuery = useRef(
    (location.state as { autoQuery?: string } | null)?.autoQuery ?? ''
  )

  useEffect(() => {
    if (!user) return
    getGraphStats(user.id)
      .then(s => {
        setGraphIsEmpty(s.nodeCount === 0)
      })
      .catch(() => {})
  }, [user])

  // Fire the auto-query once user is available, then clear router state.
  useEffect(() => {
    const query = pendingAutoQuery.current
    if (!query || !user) return
    pendingAutoQuery.current = ''
    // Replace history entry to prevent re-firing if user navigates back/forward
    navigate('/ask', { state: {}, replace: true })
    void sendMessage(query)
  }, [user, sendMessage, navigate])

  const handleSend = (text: string) => {
    void sendMessage(text)
  }

  const handleSuggestion = (text: string) => {
    void sendMessage(text)
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-screen">
      {/* Status bar */}
      <StatusBar hasError={!!error && !hasMessages} />

      {/* Chat area */}
      {!hasMessages ? (
        <div className="flex-1 overflow-y-auto">
          <EmptyAskState onSendSuggestion={handleSuggestion} isEmpty={graphIsEmpty} />
        </div>
      ) : (
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          pipelineEvents={pipelineEvents}
          scroll={scroll}
        />
      )}

      {/* Input bar */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
