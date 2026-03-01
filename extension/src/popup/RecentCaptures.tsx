import { useEffect, useState } from 'react';
import type { RecentCapture } from '../lib/storage';
import { SYNAPSE_APP_URL } from '../lib/constants';

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentCaptures() {
  const [captures, setCaptures] = useState<RecentCapture[]>([]);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getRecentCaptures' }, (res: RecentCapture[]) => {
      if (Array.isArray(res)) setCaptures(res);
    });
  }, []);

  if (captures.length === 0) return null;

  return (
    <div className="recent-captures">
      <p className="section-label">RECENT CAPTURES</p>

      <ul className="captures-list">
        {captures.map((cap, i) => (
          <li key={i} className="capture-item">
            <span className="capture-icon">
              {cap.sourceType === 'YouTube' ? '▶' : '📄'}
            </span>
            <span className="capture-title">{cap.title}</span>
            <span className="capture-time">{relativeTime(cap.capturedAt)}</span>
          </li>
        ))}
      </ul>

      <a
        className="open-synapse-link"
        href={SYNAPSE_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Synapse →
      </a>
    </div>
  );
}
