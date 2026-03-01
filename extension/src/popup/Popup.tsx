import { useState, useEffect, useCallback } from 'react';
import { Login } from './Login';
import { CapturePreview } from './CapturePreview';
import { RecentCaptures } from './RecentCaptures';
import { StatusFeedback } from './StatusFeedback';
import type { YouTubeData } from '../content/youtube';
import type { ArticleData } from '../content/article';

type AppState =
  | 'loading'
  | 'unauthenticated'
  | 'detecting'
  | 'ready'
  | 'capturing'
  | 'success'
  | 'error';

type PageType = 'youtube' | 'article' | 'unknown';

export function Popup() {
  const [state, setState] = useState<AppState>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pageType, setPageType] = useState<PageType>('unknown');
  const [youtubeData, setYoutubeData] = useState<YouTubeData | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [capturedTitle, setCapturedTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ── Auth check ─────────────────────────────────────────────────────────
  useEffect(() => {
    chrome.runtime.sendMessage(
      { action: 'checkAuth' },
      (res: { authenticated: boolean; userId: string | null; userEmail: string | null }) => {
        if (res?.authenticated && res.userId) {
          setUserId(res.userId);
          setUserEmail(res.userEmail);
          setState('detecting');
        } else {
          setState('unauthenticated');
        }
      }
    );
  }, []);

  // ── Page detection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'detecting') return;

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab?.id) {
        setState('ready');
        return;
      }

      const tabId = tab.id;
      const tabUrl = tab.url || '';

      // Check if it's a protected page
      if (
        tabUrl.startsWith('chrome://') ||
        tabUrl.startsWith('chrome-extension://') ||
        tabUrl.startsWith('about:')
      ) {
        setPageType('unknown');
        setState('ready');
        return;
      }

      // Try YouTube first
      if (tabUrl.includes('youtube.com/watch')) {
        injectAndFetch(tabId, 'content-youtube.js', 'getYouTubeData', data => {
          if (data?.videoId) {
            setYoutubeData(data as YouTubeData);
            setPageType('youtube');
          } else {
            setPageType('unknown');
          }
          setState('ready');
        });
      } else {
        // Article
        injectAndFetch(tabId, 'content-article.js', 'getArticleData', data => {
          if (data?.url) {
            setArticleData(data as ArticleData);
            setPageType('article');
          } else {
            setPageType('unknown');
          }
          setState('ready');
        });
      }
    });
  }, [state]);

  // ── Inject content script + send message ───────────────────────────────
  function injectAndFetch(
    tabId: number,
    script: string,
    action: string,
    callback: (data: unknown) => void
  ) {
    chrome.tabs.sendMessage(tabId, { action }, response => {
      if (chrome.runtime.lastError || !response) {
        // Content script not loaded — inject and retry
        chrome.scripting.executeScript(
          { target: { tabId }, files: [script] },
          () => {
            if (chrome.runtime.lastError) {
              callback(null);
              return;
            }
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action }, retryResponse => {
                if (chrome.runtime.lastError) {
                  callback(null);
                } else {
                  callback(retryResponse?.data ?? null);
                }
              });
            }, 500);
          }
        );
      } else {
        callback(response?.data ?? null);
      }
    });
  }

  // ── Capture ────────────────────────────────────────────────────────────
  const handleCapture = useCallback(
    async (extractNow: boolean) => {
      setState('capturing');

      const captureData =
        pageType === 'youtube'
          ? { type: 'youtube' as const, youtube: youtubeData! }
          : { type: 'article' as const, article: articleData! };

      const title =
        pageType === 'youtube'
          ? (youtubeData?.title ?? 'YouTube Video')
          : (articleData?.title ?? 'Web Article');

      return new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'captureContent', data: captureData, extractNow },
          (res: { success: boolean; error?: string }) => {
            if (res?.success) {
              setCapturedTitle(title);
              setState('success');
              resolve();
            } else {
              setErrorMessage(res?.error ?? 'Capture failed');
              setState('error');
              reject(new Error(res?.error));
            }
          }
        );
      });
    },
    [pageType, youtubeData, articleData]
  );

  // ── Sign out ───────────────────────────────────────────────────────────
  function handleSignOut() {
    chrome.runtime.sendMessage({ action: 'signOut' }, () => {
      setUserId(null);
      setUserEmail(null);
      setState('unauthenticated');
    });
  }

  // ── Dismiss feedback ───────────────────────────────────────────────────
  function handleDismiss() {
    setState('ready');
    setErrorMessage('');
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (state === 'loading' || state === 'detecting') {
    return (
      <div className="popup">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p className="loading-text">
            {state === 'detecting' ? 'Detecting page...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return (
      <div className="popup">
        <Login
          onLogin={(uid, email) => {
            setUserId(uid);
            setUserEmail(email);
            setState('detecting');
          }}
        />
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="popup">
        <Header email={userEmail} onSignOut={handleSignOut} />
        <StatusFeedback
          status="success"
          capturedTitle={capturedTitle}
          onDismiss={handleDismiss}
        />
        <RecentCaptures />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="popup">
        <Header email={userEmail} onSignOut={handleSignOut} />
        <StatusFeedback
          status="error"
          capturedTitle=""
          errorMessage={errorMessage}
          onDismiss={handleDismiss}
        />
      </div>
    );
  }

  return (
    <div className="popup">
      <Header email={userEmail} onSignOut={handleSignOut} />
      <CapturePreview
        pageType={pageType}
        youtubeData={youtubeData}
        articleData={articleData}
        onCapture={handleCapture}
        isCapturing={state === 'capturing'}
      />
      <RecentCaptures />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({
  email,
  onSignOut,
}: {
  email: string | null;
  onSignOut: () => void;
}) {
  return (
    <div className="header">
      <div className="header-brand">
        <div className="logo-mark">S</div>
        <span className="logo-text">Synapse</span>
      </div>
      <div className="header-right">
        {email && (
          <span className="user-email" title={email}>
            {email.length > 24 ? email.substring(0, 22) + '…' : email}
          </span>
        )}
        <button
          className="sign-out-btn"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          ⏻
        </button>
      </div>
    </div>
  );
}
