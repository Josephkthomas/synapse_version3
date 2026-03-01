import { useState, useCallback } from 'react'
import { QuickCaptureTab } from './QuickCaptureTab'
import { YouTubeTab } from './YouTubeTab'
import { MeetingsTab } from './MeetingsTab'
import { DocumentsTab } from './DocumentsTab'
import { HistoryTab } from './HistoryTab'
import { ContentColumn } from '../layout/ContentColumn'
import { ToggleGroup } from '../shared/ToggleGroup'

type ActiveTab = 'quick-capture' | 'youtube' | 'meetings' | 'documents' | 'history'

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'quick-capture', label: 'Quick Capture' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'documents', label: 'Documents' },
  { key: 'history', label: 'History' },
]

export function IngestView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quick-capture')
  const [_reExtractContent, _setReExtractContent] = useState<string | null>(null)

  const handleReExtract = useCallback((_content: string, _settings: {
    mode: string
    emphasis: string
    guidance: string | null
  }) => {
    // Switch to Quick Capture tab — content pre-fill would be done via
    // lifting state up. For now, switch tab so user can paste.
    setActiveTab('quick-capture')
  }, [])

  return (
    <ContentColumn maxWidth={720}>
      {/* Tab bar */}
      <ToggleGroup
        options={TABS}
        value={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 24 }}
      />

      {/* Tab content */}
      {activeTab === 'quick-capture' && <QuickCaptureTab />}

      {activeTab === 'youtube' && <YouTubeTab />}

      {activeTab === 'meetings' && <MeetingsTab />}

      {activeTab === 'documents' && <DocumentsTab />}

      {activeTab === 'history' && (
        <HistoryTab onReExtract={handleReExtract} />
      )}
    </ContentColumn>
  )
}
