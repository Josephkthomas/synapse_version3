import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── YouTube Pipeline Orchestrator ─────────────────────────────────────────────
// Delegates to two focused serverless functions:
// 1. /api/youtube/fetch-transcripts — fetches transcripts for pending items
// 2. /api/youtube/extract-knowledge — runs extraction on items with transcripts
//
// Each sub-function runs as an independent serverless invocation with its own
// timeout budget. Even if this orchestrator times out, the sub-functions
// continue running independently.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = `https://${req.headers.host}`;
  const authHeader = req.headers['authorization'] || '';
  const startTime = Date.now();

  try {
    // Phase 1: Fetch transcripts for pending items
    const fetchRes = await fetch(`${baseUrl}/api/youtube/fetch-transcripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });
    const fetchData = await fetchRes.json();

    // Phase 2: Extract knowledge for items with transcripts
    const extractRes = await fetch(`${baseUrl}/api/youtube/extract-knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });
    const extractData = await extractRes.json();

    return res.status(200).json({
      success: true,
      fetch: fetchData,
      extract: extractData,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[process] Orchestrator error:', err);
    return res.status(500).json({ success: false, error: msg, duration_ms: Date.now() - startTime });
  }
}
