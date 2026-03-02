import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── ENVIRONMENT ───────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APIFY_API_KEY = process.env.APIFY_API_KEY ?? '';
const APIFY_ACTOR_ID = 'pintostudio/youtube-transcript-scraper';

const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── VIDEO ID PARSING ─────────────────────────────────────────────────────────

function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// ─── TRANSCRIPT TIERS ─────────────────────────────────────────────────────────

async function fetchTranscriptTier1(videoId: string): Promise<string | null> {
  try {
    const { getSubtitles } = await import('youtube-caption-extractor');
    const subtitles = await Promise.race([
      getSubtitles({ videoID: videoId, lang: 'en' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tier 1 timeout')), 15000)
      ),
    ]);
    if (!subtitles || subtitles.length === 0) return null;
    return subtitles.map((s: { text: string }) => s.text).join(' ');
  } catch {
    return null;
  }
}

function encodeInnertubeParams(videoId: string): string {
  const videoIdBytes = Buffer.from(videoId, 'utf8');
  const buf = Buffer.alloc(2 + videoIdBytes.length);
  buf.writeUInt8(0x0a, 0);
  buf.writeUInt8(videoIdBytes.length, 1);
  videoIdBytes.copy(buf, 2);
  return buf.toString('base64');
}

async function fetchTranscriptTier2(videoId: string): Promise<string | null> {
  try {
    const params = encodeInnertubeParams(videoId);
    const response = await Promise.race([
      fetch('https://www.youtube.com/youtubei/v1/get_transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20231219.04.00' } },
          params,
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tier 2 timeout')), 15000)
      ),
    ]);
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    const actions = data?.actions as Array<Record<string, unknown>> | undefined;
    const segments = (actions?.[0] as Record<string, unknown> | undefined)
      ?.updateEngagementPanelAction as Record<string, unknown> | undefined;
    const content = (segments?.content as Record<string, unknown> | undefined)
      ?.transcriptRenderer as Record<string, unknown> | undefined;
    const body = ((content?.content as Record<string, unknown> | undefined)
      ?.transcriptSearchPanelRenderer as Record<string, unknown> | undefined)
      ?.body as Record<string, unknown> | undefined;
    const segmentList = (body?.transcriptSegmentListRenderer as Record<string, unknown> | undefined)
      ?.initialSegments as Array<Record<string, unknown>> | undefined;
    if (!segmentList?.length) return null;
    return segmentList
      .map(seg => {
        const renderer = seg?.transcriptSegmentRenderer as Record<string, unknown> | undefined;
        const runs = (renderer?.snippet as Record<string, unknown> | undefined)
          ?.runs as Array<{ text?: string }> | undefined;
        return runs?.map(r => r?.text ?? '').join('') ?? '';
      })
      .filter(Boolean)
      .join(' ');
  } catch {
    return null;
  }
}

async function fetchTranscriptTier3(
  videoUrl: string
): Promise<{ transcript: string | null; language: string | null }> {
  if (!APIFY_API_KEY) return { transcript: null, language: null };
  try {
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [videoUrl], outputFormat: 'singleStringOutput' }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!startResponse.ok) return { transcript: null, language: null };

    const startData = await startResponse.json() as {
      data?: { id?: string; defaultDatasetId?: string };
    };
    const runId = startData.data?.id;
    const datasetId = startData.data?.defaultDatasetId;
    if (!runId) return { transcript: null, language: null };

    const pollStart = Date.now();
    while (Date.now() - pollStart < 120_000) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!statusResponse.ok) continue;
      const statusData = await statusResponse.json() as { data?: { status?: string } };
      const status = statusData.data?.status;
      if (status === 'SUCCEEDED') {
        const resultsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!resultsResponse.ok) return { transcript: null, language: null };
        const items = await resultsResponse.json() as Array<{
          transcript?: string;
          captions?: string;
          language?: string;
        }>;
        const transcript = items[0]?.transcript ?? items[0]?.captions ?? null;
        return { transcript, language: items[0]?.language ?? 'en' };
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status ?? '')) {
        return { transcript: null, language: null };
      }
    }
    return { transcript: null, language: null };
  } catch {
    return { transcript: null, language: null };
  }
}

// ─── TRANSCRIPT FORMATTING ────────────────────────────────────────────────────

function formatTranscriptText(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const paragraphs: string[] = [];
  const SENTENCES_PER_PARAGRAPH = 7;
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    const para = sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join('').trim();
    if (para) paragraphs.push(para);
  }
  return paragraphs.length > 1 ? paragraphs.join('\n\n') : text;
}

// ─── ORCHESTRATOR ─────────────────────────────────────────────────────────────

async function fetchTranscript(
  videoId: string,
  videoUrl: string
): Promise<{ transcript: string | null; language: string | null; tier: number }> {
  const t1 = await fetchTranscriptTier1(videoId);
  if (t1) return { transcript: formatTranscriptText(t1), language: 'en', tier: 1 };

  const t2 = await fetchTranscriptTier2(videoId);
  if (t2) return { transcript: formatTranscriptText(t2), language: 'en', tier: 2 };

  const t3 = await fetchTranscriptTier3(videoUrl);
  if (t3.transcript) {
    return { transcript: formatTranscriptText(t3.transcript), language: t3.language ?? 'en', tier: 3 };
  }

  return { transcript: null, language: null, tier: 0 };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify user auth
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const token = auth.slice(7);
  const supabase = getSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { videoUrl } = req.body as { videoUrl?: string };
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

  const videoId = extractVideoId(videoUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

  try {
    const { transcript, language, tier } = await fetchTranscript(videoId, videoUrl);

    if (!transcript) {
      return res.status(422).json({
        error: 'No transcript available for this video. It may lack captions or be a live stream.',
      });
    }

    return res.status(200).json({ transcript, language, tier, videoId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[transcript] Error:', err);
    return res.status(500).json({ error: msg });
  }
}
