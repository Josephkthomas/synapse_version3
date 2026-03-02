import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRAGQuery } from '../hooks/useRAGQuery'
import { useChatScroll } from '../hooks/useChatScroll'
import { useQueryComposer } from '../hooks/useQueryComposer'
import { getGraphStats } from '../services/supabase'
import { DEFAULT_QUERY_CONFIG } from '../types/rag'
import { StatusBar } from '../components/ask/StatusBar'
import { ChatMessageList } from '../components/ask/ChatMessageList'
import { ChatInput } from '../components/ask/ChatInput'
import { EmptyAskState } from '../components/ask/EmptyAskState'

export function AskView() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { messages, isLoading, pipelineEvents, error, sendMessage, clearChat } = useRAGQuery()
  const scroll = useChatScroll(messages.length)
  const {
    config,
    setMindset,
    toggleScopeAnchor,
    clearScope,
    setToolMode,
    setModelTier,
  } = useQueryComposer()
  const [graphIsEmpty, setGraphIsEmpty] = useState(false)

  const pendingAutoQuery = useRef(
    (location.state as { autoQuery?: string } | null)?.autoQuery ?? ''
  )

  useEffect(() => {
    if (!user) return
    getGraphStats(user.id)
      .then(s => setGraphIsEmpty(s.nodeCount === 0))
      .catch(() => {})
  }, [user])

  // Fire the auto-query once using the default config
  useEffect(() => {
    const query = pendingAutoQuery.current
    if (!query || !user) return
    pendingAutoQuery.current = ''
    navigate('/ask', { state: {}, replace: true })
    void sendMessage(query, DEFAULT_QUERY_CONFIG)
  }, [user, sendMessage, navigate])

  const handleSend = (text: string) => {
    void sendMessage(text, config)
  }

  const handleSuggestion = (text: string) => {
    void sendMessage(text, config)
  }

  const hasMessages = messages.length > 0

  const helperText =
    config.scopeAnchors.length > 0
      ? `Scoped to ${config.scopeAnchors.length} anchor${config.scopeAnchors.length > 1 ? 's' : ''}`
      : undefined

  return (
    <div className="flex flex-col h-full">
      {/* Page title — only shown in empty state */}
      {!hasMessages && (
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <h1
            className="font-display font-extrabold text-text-primary"
            style={{ fontSize: 26, letterSpacing: '-0.02em', margin: 0 }}
          >
            Ask
          </h1>
        </div>
      )}

      {/* Status bar with reset */}
      <StatusBar
        hasError={!!error && !hasMessages}
        hasMessages={hasMessages}
        onClearChat={clearChat}
      />

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

      {/* Input bar with inline dropdown toolbar */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        helperText={helperText}
        config={config}
        onSetMindset={setMindset}
        onToggleScopeAnchor={toggleScopeAnchor}
        onClearScope={clearScope}
        onSetToolMode={setToolMode}
        onSetModelTier={setModelTier}
      />
    </div>
  )
}
