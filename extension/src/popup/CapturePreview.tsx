import { useState } from 'react';
import type { YouTubeData } from '../content/youtube';
import type { ArticleData } from '../content/article';

interface CapturePreviewProps {
  pageType: 'youtube' | 'article' | 'unknown';
  youtubeData: YouTubeData | null;
  articleData: ArticleData | null;
  onCapture: (extractNow: boolean) => Promise<void>;
  isCapturing: boolean;
}

function wordCountLabel(n: number): string {
  if (n < 1000) return `${n} words`;
  return `${(n / 1000).toFixed(1)}k words`;
}

export function CapturePreview({
  pageType,
  youtubeData,
  articleData,
  onCapture,
  isCapturing,
}: CapturePreviewProps) {
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function handleCapture(extractNow: boolean) {
    setCaptureError(null);
    try {
      await onCapture(extractNow);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : 'Capture failed');
    }
  }

  // ── YouTube Preview ─────────────────────────────────────────────────────
  if (pageType === 'youtube' && youtubeData) {
    const yt = youtubeData;
    return (
      <div className="capture-preview">
        <div className="page-type-badge">
          <span className="page-type-icon">▶</span>
          <span>YouTube Video</span>
        </div>

        {/* Thumbnail + metadata */}
        <div className="content-card">
          <img
            className="yt-thumbnail"
            src={yt.thumbnailUrl}
            alt={yt.title}
          />
          <div className="content-meta">
            <p className="content-title">{yt.title}</p>
            <p className="content-sub">{yt.channelName}</p>
            <p className="content-sub">{wordCountLabel(yt.wordCount)}</p>
          </div>
        </div>

        {/* Transcript indicator */}
        <div className={`transcript-indicator ${yt.hasTranscript ? 'has-transcript' : 'no-transcript'}`}>
          {yt.hasTranscript ? (
            <>
              <span className="indicator-dot green" />
              Transcript available
            </>
          ) : (
            <>
              <span className="indicator-dot amber" />
              No transcript — Synapse will extract later
            </>
          )}
        </div>

        {captureError && <div className="error-message">{captureError}</div>}

        <button
          className="btn btn-primary"
          onClick={() => handleCapture(false)}
          disabled={isCapturing}
        >
          {isCapturing ? 'Saving...' : 'Save to Synapse'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => handleCapture(true)}
          disabled={isCapturing}
        >
          Save &amp; Extract Now
        </button>
      </div>
    );
  }

  // ── Article Preview ─────────────────────────────────────────────────────
  if (pageType === 'article' && articleData) {
    const art = articleData;
    const contentPreview = (art.selectedText || art.content).substring(0, 200);
    return (
      <div className="capture-preview">
        <div className="page-type-badge">
          <span className="page-type-icon">📄</span>
          <span>Web Article</span>
        </div>

        <div className="content-card">
          <div className="content-meta">
            <p className="content-title">{art.title}</p>
            <p className="content-sub">
              {art.siteName}
              {art.author ? ` · ${art.author}` : ''}
            </p>
            <p className="content-sub">
              {art.hasSelection
                ? `Selected text (${wordCountLabel(art.wordCount)})`
                : `Full article · ${wordCountLabel(art.wordCount)}`}
            </p>
          </div>
        </div>

        {contentPreview && (
          <p className="content-snippet">{contentPreview}{art.content.length > 200 ? '…' : ''}</p>
        )}

        {captureError && <div className="error-message">{captureError}</div>}

        <button
          className="btn btn-primary"
          onClick={() => handleCapture(false)}
          disabled={isCapturing}
        >
          {isCapturing ? 'Saving...' : 'Save to Synapse'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => handleCapture(true)}
          disabled={isCapturing}
        >
          Save &amp; Extract Now
        </button>
      </div>
    );
  }

  // ── Unknown / Unsupported ───────────────────────────────────────────────
  return (
    <div className="capture-preview">
      <div className="empty-state">
        <p className="empty-icon">🌐</p>
        <p className="empty-title">No capturable content</p>
        <p className="empty-sub">
          Navigate to a YouTube video or web article to capture content into Synapse.
        </p>
      </div>
    </div>
  );
}
