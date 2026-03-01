import { useRef } from 'react'
import { useAutomationStatus } from '../hooks/useAutomationStatus'
import { IntegrationDashboard } from '../components/automate/IntegrationDashboard'
import { ProcessingQueueSection } from '../components/automate/ProcessingQueueSection'
import { ScanHistoryDrawer } from '../components/automate/ScanHistoryDrawer'
import { AutomateEmptyState } from '../components/automate/AutomateEmptyState'
import { ContentColumn } from '../components/layout/ContentColumn'

export function AutomateView() {
  const {
    summary,
    channels,
    playlists,
    scanHistory,
    isLoading,
    error,
  } = useAutomationStatus()

  const queueSectionRef = useRef<HTMLDivElement>(null)

  // Determine if everything is empty (show full empty state)
  const isAllEmpty = summary && !isLoading &&
    summary.youtube.channelCount === 0 &&
    summary.youtube.playlistCount === 0 &&
    summary.meetings.totalMeetings === 0 &&
    summary.extension.captureCount === 0 &&
    summary.queue.pending === 0 &&
    summary.queue.processing === 0 &&
    summary.queue.completed === 0 &&
    summary.queue.failed === 0

  return (
    <ContentColumn>
      {/* Loading */}
      {isLoading && !summary && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Loading automation status...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <p className="font-body" style={{ fontSize: 12, color: '#ef4444' }}>
            {error}
          </p>
        </div>
      )}

      {/* Full Empty State */}
      {isAllEmpty && <AutomateEmptyState />}

      {/* Integration Dashboard + Queue */}
      {summary && !isAllEmpty && (
        <>
          <IntegrationDashboard
            summary={summary}
            channels={channels}
            playlists={playlists}
            queueSectionRef={queueSectionRef}
          />

          {/* Processing Queue Section */}
          <div ref={queueSectionRef} style={{ marginTop: 36 }}>
            <ProcessingQueueSection />
          </div>

          {/* Scan History */}
          <div style={{ marginTop: 28 }}>
            <ScanHistoryDrawer entries={scanHistory} />
          </div>
        </>
      )}
    </ContentColumn>
  )
}
