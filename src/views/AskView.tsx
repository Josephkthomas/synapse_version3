import { useEffect, useState } from 'react'
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
  const { messages, isLoading, currentStep, error, sendMessage } = useRAGQuery()
  const scroll = useChatScroll(messages.length)
  const [chunkCount, setChunkCount] = useState<number | undefined>(undefined)
  const [graphIsEmpty, setGraphIsEmpty] = useState(false)

  useEffect(() => {
    if (!user) return
    getGraphStats(user.id)
      .then(s => {
        setChunkCount(s.chunkCount)
        setGraphIsEmpty(s.nodeCount === 0)
      })
      .catch(() => {})
  }, [user])

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
          currentStep={currentStep}
          chunkCount={chunkCount}
          scroll={scroll}
        />
      )}

      {/* Input bar */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
