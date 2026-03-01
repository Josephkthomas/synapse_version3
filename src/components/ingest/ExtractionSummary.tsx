import { useState } from 'react'
import { CheckCircle, Star } from 'lucide-react'

interface ExtractionSummaryProps {
  entityCount: number
  relationshipCount: number
  crossConnectionCount: number
  durationMs: number
  duplicatesSkipped: number
  onViewInBrowse: () => void
  onIngestAnother: () => void
  onRateExtraction?: (rating: number, text?: string) => void
}

export function ExtractionSummary({
  entityCount,
  relationshipCount,
  crossConnectionCount,
  durationMs,
  duplicatesSkipped,
  onViewInBrowse,
  onIngestAnother,
  onRateExtraction,
}: ExtractionSummaryProps) {
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  const processingTime = (durationMs / 1000).toFixed(1)

  const stats = [
    { value: entityCount, label: 'Entities' },
    { value: relationshipCount, label: 'Relationships' },
    { value: crossConnectionCount, label: 'Cross-Connections' },
    { value: `${processingTime}s`, label: 'Processing' },
  ]

  const handleSubmitRating = () => {
    if (rating > 0 && onRateExtraction) {
      onRateExtraction(rating, feedbackText || undefined)
      setRatingSubmitted(true)
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '20px 24px',
        textAlign: 'center',
      }}
    >
      <CheckCircle
        size={32}
        style={{ color: 'var(--color-semantic-green-500)', marginBottom: 8 }}
      />

      <h3
        className="font-display font-bold"
        style={{
          fontSize: 18,
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}
      >
        Extraction Complete
      </h3>

      {duplicatesSkipped > 0 && (
        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            marginBottom: 8,
          }}
        >
          {duplicatesSkipped} entities matched existing graph nodes and were merged.
        </p>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginTop: 20,
          marginBottom: 20,
        }}
      >
        {stats.map(stat => (
          <div key={stat.label}>
            <div
              className="font-display font-extrabold"
              style={{ fontSize: 24, color: 'var(--color-text-primary)' }}
            >
              {stat.value}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
        <button
          type="button"
          onClick={onViewInBrowse}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 22px',
            borderRadius: 8,
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
          }}
        >
          View in Browse
        </button>
        <button
          type="button"
          onClick={onIngestAnother}
          className="font-body font-semibold cursor-pointer"
          style={{
            fontSize: 12,
            padding: '10px 22px',
            borderRadius: 8,
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
          }}
        >
          Ingest Another
        </button>
        {onRateExtraction && !ratingSubmitted && (
          <button
            type="button"
            onClick={() => setShowRating(!showRating)}
            className="font-body font-semibold cursor-pointer"
            style={{
              fontSize: 12,
              padding: '10px 22px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent-500)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Rate Extraction
          </button>
        )}
      </div>

      {/* Rating Form */}
      {showRating && !ratingSubmitted && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <Star
                  size={20}
                  fill={n <= rating ? 'var(--color-accent-500)' : 'none'}
                  color={n <= rating ? 'var(--color-accent-500)' : 'var(--color-text-placeholder)'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="Optional feedback..."
            rows={2}
            className="font-body w-full resize-none"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              background: 'var(--color-bg-inset)',
              color: 'var(--color-text-body)',
              outline: 'none',
              maxWidth: 300,
              margin: '0 auto',
              display: 'block',
            }}
          />
          <button
            type="button"
            onClick={handleSubmitRating}
            disabled={rating === 0}
            className="font-body font-semibold cursor-pointer"
            style={{
              fontSize: 11,
              padding: '6px 14px',
              borderRadius: 6,
              background: rating > 0 ? '#1a1a1a' : 'rgba(26,26,26,0.3)',
              border: 'none',
              color: 'white',
              marginTop: 8,
            }}
          >
            Submit
          </button>
        </div>
      )}

      {ratingSubmitted && (
        <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 12 }}>
          Thanks for the feedback!
        </p>
      )}
    </div>
  )
}
