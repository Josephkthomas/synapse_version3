// YouTube content script — extracts video data and transcript

export interface YouTubeData {
  videoId: string;
  title: string;
  channelName: string;
  channelUrl: string;
  description: string;
  thumbnailUrl: string;
  transcript: string | null;
  hasTranscript: boolean;
  wordCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVideoId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function getTitle(): string {
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (og?.content) return og.content.replace(/ - YouTube$/, '').trim();
  return document.title.replace(/ - YouTube$/, '').trim();
}

function getChannelName(): string {
  // Try structured data first
  const link = document.querySelector<HTMLLinkElement>('link[itemprop="name"]');
  if (link?.getAttribute('content')) return link.getAttribute('content')!;

  // Try ytd-video-owner-renderer
  const ownerEl = document.querySelector('ytd-video-owner-renderer #channel-name yt-formatted-string');
  if (ownerEl?.textContent) return ownerEl.textContent.trim();

  // Try meta author
  const author = document.querySelector<HTMLMetaElement>('meta[name="author"]');
  if (author?.content) return author.content;

  return '';
}

function getChannelUrl(): string {
  const channelLink = document.querySelector<HTMLAnchorElement>(
    'ytd-video-owner-renderer a#avatar-link, ytd-video-owner-renderer yt-formatted-string a'
  );
  if (channelLink?.href) return channelLink.href;
  return '';
}

function getDescription(): string {
  // Try expanded description text
  const expanded = document.querySelector('ytd-text-inline-expander yt-attributed-string');
  if (expanded?.textContent) return expanded.textContent.trim().substring(0, 500);

  const metaDesc = document.querySelector<HTMLMetaElement>(
    'meta[name="description"], meta[property="og:description"]'
  );
  if (metaDesc?.content) return metaDesc.content.substring(0, 500);
  return '';
}

// ─── Transcript Extraction ───────────────────────────────────────────────────

async function fetchTranscriptViaInnertube(videoId: string): Promise<string | null> {
  try {
    // Get API key from ytcfg if available
    const ytcfg = (window as unknown as { ytcfg?: { get: (k: string) => string } }).ytcfg;
    const apiKey = ytcfg?.get('INNERTUBE_API_KEY') || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

    const params = btoa(String.fromCharCode(0x0a, videoId.length, ...Array.from(videoId).map(c => c.charCodeAt(0))));

    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: { clientName: 'WEB', clientVersion: '2.20240101' },
          },
          params,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;
    const data = await response.json() as {
      actions?: Array<{
        updateEngagementPanelAction?: {
          content?: {
            transcriptRenderer?: {
              content?: {
                transcriptSearchPanelRenderer?: {
                  body?: {
                    transcriptSegmentListRenderer?: {
                      initialSegments?: Array<{
                        transcriptSegmentRenderer?: {
                          snippet?: { runs?: Array<{ text?: string }> };
                        };
                      }>;
                    };
                  };
                };
              };
            };
          };
        };
      }>;
    };

    const segments =
      data?.actions?.[0]?.updateEngagementPanelAction?.content
        ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
        ?.transcriptSegmentListRenderer?.initialSegments ?? [];

    const text = segments
      .map(s =>
        s.transcriptSegmentRenderer?.snippet?.runs?.map(r => r.text ?? '').join('') ?? ''
      )
      .join(' ')
      .trim();

    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

async function fetchTranscriptFromPanel(): Promise<string | null> {
  try {
    const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    if (segments.length === 0) return null;
    const text = Array.from(segments)
      .map(s => s.querySelector('yt-formatted-string')?.textContent?.trim() ?? '')
      .join(' ');
    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

// ─── Message Listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getPageType') {
    sendResponse({ type: 'youtube', isYouTube: true });
    return true;
  }

  if (request.action === 'getYouTubeData') {
    (async () => {
      const videoId = getVideoId();
      if (!videoId) {
        sendResponse({ error: 'No video ID found' });
        return;
      }

      const title = getTitle();
      const channelName = getChannelName();
      const channelUrl = getChannelUrl();
      const description = getDescription();
      const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      // Attempt transcript extraction
      let transcript: string | null = null;
      transcript = await fetchTranscriptViaInnertube(videoId);
      if (!transcript) {
        transcript = await fetchTranscriptFromPanel();
      }

      const hasTranscript = transcript !== null && transcript.length > 0;
      const wordCount = hasTranscript
        ? transcript!.split(/\s+/).filter(Boolean).length
        : description.split(/\s+/).filter(Boolean).length;

      const data: YouTubeData = {
        videoId,
        title,
        channelName,
        channelUrl,
        description,
        thumbnailUrl,
        transcript,
        hasTranscript,
        wordCount,
      };

      sendResponse({ data });
    })();
    return true; // async
  }

  return false;
});
