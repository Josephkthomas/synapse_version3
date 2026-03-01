// Article content script — extracts text and metadata from any web page
// Guard: if on YouTube, skip (let youtube.ts handle it)

export interface ArticleData {
  url: string;
  title: string;
  content: string;
  selectedText: string | null;
  author: string | null;
  publishedDate: string | null;
  siteName: string;
  wordCount: number;
  hasSelection: boolean;
}

const isYouTube = window.location.hostname.includes('youtube.com');

// ─── Meta helpers ────────────────────────────────────────────────────────────

function getMeta(selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLMetaElement>(sel);
    if (el?.content) return el.content;
  }
  return null;
}

// ─── Content extraction ──────────────────────────────────────────────────────

function extractContent(): string {
  const MAX_CHARS = 50000;

  // 1. Semantic article element
  const article = document.querySelector('article');
  if (article?.innerText?.trim()) {
    return article.innerText.trim().substring(0, MAX_CHARS);
  }

  // 2. ARIA main
  const ariaMain = document.querySelector<HTMLElement>('[role="main"]');
  if (ariaMain?.innerText?.trim()) {
    return ariaMain.innerText.trim().substring(0, MAX_CHARS);
  }

  // 3. main element
  const main = document.querySelector<HTMLElement>('main');
  if (main?.innerText?.trim()) {
    return main.innerText.trim().substring(0, MAX_CHARS);
  }

  // 4. Largest text block heuristic
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('div, section, p')
  ).filter(el => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') ?? '';
    const cls = el.className?.toString().toLowerCase() ?? '';
    // Skip nav, header, footer elements
    if (['nav', 'header', 'footer'].includes(tag)) return false;
    if (['navigation', 'banner', 'contentinfo'].includes(role)) return false;
    if (cls.includes('nav') || cls.includes('header') || cls.includes('footer') || cls.includes('sidebar')) return false;
    return true;
  });

  let bestEl: HTMLElement | null = null;
  let bestLen = 0;
  for (const el of candidates) {
    const len = el.innerText?.length ?? 0;
    if (len > bestLen) {
      bestLen = len;
      bestEl = el;
    }
  }

  if (bestEl?.innerText?.trim()) {
    return bestEl.innerText.trim().substring(0, MAX_CHARS);
  }

  // 5. Fallback: body text (truncated)
  return (document.body.innerText ?? '').trim().substring(0, 10000);
}

// ─── Message Listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // If on YouTube, don't respond to article requests
  if (isYouTube && request.action !== 'getPageType') {
    return false;
  }

  if (request.action === 'getPageType') {
    if (isYouTube) {
      // Let youtube.ts handle it — return false to allow youtube.ts to respond
      return false;
    }
    sendResponse({ type: 'article', isYouTube: false });
    return true;
  }

  if (request.action === 'getArticleData') {
    if (isYouTube) return false;

    try {
      const url = window.location.href;
      const title =
        getMeta(['meta[property="og:title"]']) || document.title || url;

      const selectedText = window.getSelection()?.toString().trim() || null;
      const hasSelection = !!selectedText && selectedText.length > 0;

      const content = hasSelection
        ? selectedText!
        : extractContent();

      const author =
        getMeta([
          'meta[name="author"]',
          'meta[property="article:author"]',
        ]) || null;

      const publishedDate =
        getMeta(['meta[property="article:published_time"]']) || null;

      const siteName =
        getMeta(['meta[property="og:site_name"]']) ||
        window.location.hostname.replace(/^www\./, '');

      const wordCount = content.split(/\s+/).filter(Boolean).length;

      const data: ArticleData = {
        url,
        title,
        content,
        selectedText: hasSelection ? selectedText : null,
        author,
        publishedDate,
        siteName,
        wordCount,
        hasSelection,
      };

      sendResponse({ data });
    } catch (err) {
      sendResponse({ error: String(err) });
    }
    return true;
  }

  return false;
});
