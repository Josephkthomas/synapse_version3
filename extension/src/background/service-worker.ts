import { getCurrentSession, saveKnowledgeSource, getSupabase } from '../lib/supabase';
import {
  addRecentCapture,
  getRecentCaptures,
  type RecentCapture,
} from '../lib/storage';
import type { YouTubeData } from '../content/youtube';
import type { ArticleData } from '../content/article';

// ─── Context Menu Registration ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-synapse',
    title: 'Save to Synapse',
    contexts: ['selection'],
  });
});

// ─── Context Menu Click ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-synapse') return;

  const { session, userId } = await getCurrentSession();
  if (!session || !userId) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#d63a00' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    return;
  }

  const selectedText = info.selectionText;
  if (!selectedText || selectedText.length < 10) return;

  try {
    const pageUrl = tab?.url || '';
    const pageTitle = tab?.title || 'Web Capture';
    const siteName = pageUrl ? new URL(pageUrl).hostname.replace(/^www\./, '') : '';

    await saveKnowledgeSource({
      title: pageTitle,
      content: selectedText,
      sourceType: 'Document',
      sourceUrl: pageUrl,
      userId,
      metadata: {
        siteName,
        hasSelection: true,
        wordCount: selectedText.split(/\s+/).filter(Boolean).length,
      },
    });

    await addRecentCapture({
      title: pageTitle,
      sourceType: 'Document',
      capturedAt: new Date().toISOString(),
      sourceUrl: pageUrl,
    });

    // Success badge
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
  } catch {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
  }
});

// ─── Capture Handler ─────────────────────────────────────────────────────────

interface CaptureData {
  type: 'youtube' | 'article';
  youtube?: YouTubeData;
  article?: ArticleData;
}

async function handleCapture(
  data: CaptureData,
  userId: string,
  _extractNow: boolean
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (data.type === 'youtube' && data.youtube) {
      const yt = data.youtube;
      const content = yt.transcript || yt.description;
      const sourceUrl = `https://www.youtube.com/watch?v=${yt.videoId}`;

      const result = await saveKnowledgeSource({
        title: yt.title,
        content,
        sourceType: 'YouTube',
        sourceUrl,
        userId,
        metadata: {
          videoId: yt.videoId,
          channelName: yt.channelName,
          channelUrl: yt.channelUrl,
          thumbnailUrl: yt.thumbnailUrl,
          hasTranscript: yt.hasTranscript,
          wordCount: yt.wordCount,
        },
      });

      await addRecentCapture({
        title: yt.title,
        sourceType: 'YouTube',
        capturedAt: new Date().toISOString(),
        sourceUrl,
      });

      return { success: true, id: result.id };
    }

    if (data.type === 'article' && data.article) {
      const art = data.article;
      const result = await saveKnowledgeSource({
        title: art.title,
        content: art.selectedText || art.content,
        sourceType: 'Document',
        sourceUrl: art.url,
        userId,
        metadata: {
          author: art.author,
          publishedDate: art.publishedDate,
          siteName: art.siteName,
          wordCount: art.wordCount,
          hasSelection: art.hasSelection,
        },
      });

      await addRecentCapture({
        title: art.title,
        sourceType: 'Document',
        capturedAt: new Date().toISOString(),
        sourceUrl: art.url,
      });

      return { success: true, id: result.id };
    }

    return { success: false, error: 'Unknown capture type' };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'captureContent') {
    (async () => {
      const { session, userId } = await getCurrentSession();
      if (!session || !userId) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }
      const result = await handleCapture(request.data, userId, request.extractNow ?? false);
      sendResponse(result);
    })();
    return true;
  }

  if (request.action === 'getRecentCaptures') {
    getRecentCaptures().then(sendResponse);
    return true;
  }

  if (request.action === 'checkAuth') {
    getCurrentSession().then(({ session, userId, userEmail }) => {
      sendResponse({
        authenticated: !!session && !!userId,
        userId,
        userEmail,
      });
    });
    return true;
  }

  if (request.action === 'signOut') {
    import('../lib/supabase').then(({ signOut }) => {
      signOut().then(() => sendResponse({ success: true }));
    });
    return true;
  }

  return false;
});

// Keep service worker alive reference (avoids it being gc'd immediately)
const _supabase = getSupabase();
void _supabase;

// Type-only import to satisfy the compiler (used in CaptureData interfaces above)
export type { RecentCapture };
