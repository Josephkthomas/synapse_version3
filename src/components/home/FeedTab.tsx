import { Inbox, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FeedCard } from './FeedCard'
import type { FeedItem } from '../../types/feed'

interface FeedTabProps {
  items: FeedItem[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  onLoadMore: () => void
  onRetry: () => void
  selectedSourceId: string | null
  onItemSelect: (item: FeedItem) => void
}

export function FeedTab({ items, loading, error, hasMore, onLoadMore, onRetry, selectedSourceId, onItemSelect }: FeedTabProps) {
  const navigate = useNavigate()

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {[160, 120, 140].map((h, i) => (
          <div
            key={i}
            className="rounded-[12px] animate-pulse"
            style={{
              height: h,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ paddingTop: 48, textAlign: 'center' }}
      >
        <p
          className="font-body"
          style={{ fontSize: 13, color: 'var(--color-text-body)', marginBottom: 12 }}
        >
          Failed to load activity feed
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
          style={{
            fontSize: 12,
            padding: '7px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
          }}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ paddingTop: 48, textAlign: 'center' }}
      >
        <Inbox
          size={32}
          style={{ color: 'var(--color-text-placeholder)', marginBottom: 12 }}
        />
        <p
          className="font-body font-semibold"
          style={{ fontSize: 14, color: 'var(--color-text-body)', marginBottom: 4 }}
        >
          Your activity feed will appear here
        </p>
        <p
          className="font-body"
          style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 360 }}
        >
          Sources you ingest will show up as cards with their extracted entities and relationships.
        </p>
        <button
          type="button"
          onClick={() => navigate('/ingest')}
          className="font-body font-semibold cursor-pointer rounded-md"
          style={{
            fontSize: 12,
            padding: '7px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
            marginTop: 16,
          }}
        >
          Go to Ingest
        </button>
      </div>
    )
  }

  return (
    <div>
      {items.map((item, idx) => (
        <FeedCard
          key={item.source.id}
          item={item}
          animDelay={idx < 7 ? idx * 0.05 : 0}
          isSelected={item.source.id === selectedSourceId}
          onItemSelect={onItemSelect}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center" style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={onLoadMore}
            className="font-body font-semibold cursor-pointer"
            style={{
              fontSize: 12,
              padding: '7px 14px',
              background: 'none',
              border: 'none',
              color: 'var(--color-accent-500)',
            }}
          >
            View older sources
          </button>
        </div>
      )}
    </div>
  )
}
