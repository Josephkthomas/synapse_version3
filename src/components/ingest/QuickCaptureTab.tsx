import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, Link, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../../hooks/useSettings'
import { useExtraction } from '../../hooks/useExtraction'
import { AdvancedOptions } from './AdvancedOptions'
import { ExtractionProgress } from './ExtractionProgress'
import { ExtractionSummary } from './ExtractionSummary'
import { EntityReview } from '../shared/EntityReview'
import type { ExtractionConfig, ReviewEntity } from '../../types/extraction'

export function QuickCaptureTab() {
  const navigate = useNavigate()
  const { profile, extractionSettings, anchors } = useSettings()
  const { state, start, approveAndSave, reExtract, reset } = useExtraction()

  // Local form state
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<ExtractionConfig['mode']>(
    extractionSettings?.default_mode ?? 'comprehensive'
  )
  const [emphasis, setEmphasis] = useState<ExtractionConfig['anchorEmphasis']>(
    extractionSettings?.default_anchor_emphasis ?? 'standard'
  )
  const [selectedAnchorIds, setSelectedAnchorIds] = useState<string[]>([])
  const [customGuidance, setCustomGuidance] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync with extraction settings when they load
  useEffect(() => {
    if (extractionSettings) {
      setMode(extractionSettings.default_mode ?? 'comprehensive')
      setEmphasis(extractionSettings.default_anchor_emphasis ?? 'standard')
    }
  }, [extractionSettings])

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 400) + 'px'
  }, [])

  // Start extraction
  const handleExtract = useCallback(async () => {
    if (!content.trim()) return

    const config: ExtractionConfig = {
      mode,
      anchorEmphasis: emphasis,
      anchors: anchors
        .filter(a => selectedAnchorIds.includes(a.id))
        .map(a => ({
          label: a.label,
          entity_type: a.entity_type,
          description: a.description ?? '',
        })),
      userProfile: profile,
      customGuidance: customGuidance || undefined,
    }

    await start(content, config, { sourceType: 'Note' })
  }, [content, mode, emphasis, anchors, selectedAnchorIds, profile, customGuidance, start])

  // Update entities during review
  const handleEntitiesChange = useCallback((entities: ReviewEntity[]) => {
    // The useExtraction hook doesn't expose direct entity updates,
    // so we track the latest entities and pass them in handleSave
    latestEntitiesRef.current = entities
  }, [])

  const latestEntitiesRef = useRef<ReviewEntity[] | null>(null)

  // Wrap handleSave to use latest entities
  const handleSaveLatest = useCallback(async () => {
    const entities = latestEntitiesRef.current ?? state.entities
    if (entities) {
      await approveAndSave(entities)
    }
  }, [state.entities, approveAndSave])

  // Handle re-extract
  const handleReExtract = useCallback(async () => {
    await reExtract()
  }, [reExtract])

  // Handle ingest another
  const handleIngestAnother = useCallback(() => {
    reset()
    setContent('')
    setCustomGuidance('')
    setSelectedAnchorIds([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [reset])

  const isIdle = state.step === 'idle'
  const isReviewing = state.step === 'reviewing'
  const isComplete = state.step === 'complete'
  const isRunning =
    state.step === 'saving_source' ||
    state.step === 'composing_prompt' ||
    state.step === 'extracting' ||
    state.step === 'saving_nodes' ||
    state.step === 'generating_embeddings' ||
    state.step === 'chunking_source' ||
    state.step === 'discovering_connections'
  const isError = state.step === 'error'
  const showProgress = isRunning || isReviewing || isError

  const isEmpty = !content.trim()

  return (
    <div>
      {/* Idle State: Textarea + Extract Button */}
      {isIdle && (
        <>
          {/* Textarea Card */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '20px 22px',
              transition: 'border-color 0.15s ease',
            }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              placeholder="Paste a URL, write a note, or drop content here..."
              className="font-body w-full resize-none"
              style={{
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1.6,
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-card)',
                border: 'none',
                outline: 'none',
                minHeight: 120,
                maxHeight: 400,
              }}
            />

            {/* Action Bar */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 12,
                marginTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="cursor-pointer"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 6,
                    borderRadius: 6,
                    color: 'var(--color-text-secondary)',
                  }}
                  title="Attach file (coming soon)"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  type="button"
                  className="cursor-pointer"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 6,
                    borderRadius: 6,
                    color: 'var(--color-text-secondary)',
                  }}
                  title="Add URL (coming soon)"
                >
                  <Link size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleExtract}
                disabled={isEmpty}
                className="font-body font-semibold cursor-pointer flex items-center gap-2"
                style={{
                  fontSize: 13,
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: 'var(--color-accent-500)',
                  border: 'none',
                  color: 'white',
                  opacity: isEmpty ? 0.4 : 1,
                  cursor: isEmpty ? 'not-allowed' : 'pointer',
                  boxShadow: isEmpty ? 'none' : '0 2px 8px rgba(214,58,0,0.2)',
                  transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <Sparkles size={14} />
                Extract Knowledge
              </button>
            </div>
          </div>

          {/* Short content warning */}
          {!isEmpty && content.trim().length < 100 && (
            <p
              className="font-body"
              style={{
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                marginTop: 6,
                paddingLeft: 2,
              }}
            >
              Short content may produce fewer entities.
            </p>
          )}

          {/* Advanced Options */}
          <AdvancedOptions
            mode={mode}
            onModeChange={setMode}
            emphasis={emphasis}
            onEmphasisChange={setEmphasis}
            selectedAnchorIds={selectedAnchorIds}
            onAnchorIdsChange={setSelectedAnchorIds}
            customGuidance={customGuidance}
            onGuidanceChange={setCustomGuidance}
          />
        </>
      )}

      {/* Progress / Review / Error */}
      {showProgress && (
        <>
          <ExtractionProgress
            step={state.step}
            statusText={state.statusText}
            elapsedMs={state.elapsedMs}
            embeddingProgress={state.embeddingProgress}
            error={state.error}
            onRetry={isError ? handleReExtract : undefined}
            onCancel={isError ? handleIngestAnother : undefined}
          />

          {isReviewing && state.entities && state.relationships && (
            <EntityReview
              entities={latestEntitiesRef.current ?? state.entities}
              relationships={state.relationships}
              onEntitiesChange={handleEntitiesChange}
              onSave={handleSaveLatest}
              onReExtract={handleReExtract}
              saving={false}
            />
          )}
        </>
      )}

      {/* Extraction Summary */}
      {isComplete && (
        <ExtractionSummary
          entityCount={state.savedNodes?.length ?? 0}
          relationshipCount={(state.savedEdgeIds?.length ?? 0)}
          crossConnectionCount={state.crossConnectionCount}
          durationMs={state.elapsedMs}
          duplicatesSkipped={state.duplicatesSkipped}
          onViewInBrowse={() => navigate('/explore')}
          onIngestAnother={handleIngestAnother}
        />
      )}
    </div>
  )
}
