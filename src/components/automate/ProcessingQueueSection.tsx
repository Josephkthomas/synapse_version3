import { Inbox } from 'lucide-react'
import { useProcessingQueue } from '../../hooks/useProcessingQueue'
import { QueueFilterBar } from './QueueFilterBar'
import { QueueItemCard } from './QueueItemCard'

interface ProcessingQueueSectionProps {
  onViewSource?: (sourceId: string) => void
}

export function ProcessingQueueSection({ onViewSource }: ProcessingQueueSectionProps) {
  const {
    items,
    totalCount,
    filter,
    isLoading,
    setFilter,
    loadMore,
    retryItem,
    cancelItem,
    reQueueItem,
    clearCompleted,
    hasMore,
  } = useProcessingQueue()

  // Compute filter counts from items for "all" view, or show totalCount for filtered
  const counts = {
    all: totalCount,
    pending: items.filter(i => i.status === 'pending').length,
    processing: items.filter(i => i.status === 'fetching_transcript' || i.status === 'extracting').length,
    completed: items.filter(i => i.status === 'completed').length,
    failed: items.filter(i => i.status === 'failed').length,
  }

  const hasCompleted = items.some(i => i.status === 'completed')

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span
          className="font-display font-bold"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
          }}
        >
          Processing Queue
        </span>

        {hasCompleted && (
          <button
            type="button"
            onClick={clearCompleted}
            className="font-body font-semibold cursor-pointer"
            style={{
              fontSize: 11,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              padding: 0,
            }}
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <QueueFilterBar
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      {/* Loading */}
      {isLoading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Loading queue...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Inbox
            size={40}
            strokeWidth={1.5}
            style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 10px' }}
          />
          <p
            className="font-body"
            style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}
          >
            {filter === 'all'
              ? 'Your processing queue is empty.'
              : `No ${filter} items in queue.`}
          </p>
          {filter === 'all' && (
            <p
              className="font-body"
              style={{ fontSize: 12, color: 'var(--color-text-placeholder)' }}
            >
              Queue videos from the YouTube tab in Ingest, or connect channels for automatic polling.
            </p>
          )}
        </div>
      )}

      {/* Queue Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <QueueItemCard
            key={item.id}
            item={item}
            onRetry={retryItem}
            onCancel={cancelItem}
            onReQueue={reQueueItem}
            onViewSource={onViewSource}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-accent-500)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            textAlign: 'center',
            width: '100%',
            marginTop: 8,
          }}
        >
          Load more
        </button>
      )}
    </div>
  )
}
