import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── ENVIRONMENT ───────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;
const YOUTUBE_API_KEY_ENV = process.env.YOUTUBE_API_KEY;

const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_MIN_DURATION = 90; // seconds — skip Shorts
const DEFAULT_MAX_DURATION: number | null = null;

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface YouTubeChannel {
  id: string;
  user_id: string;
  channel_id: string;
  channel_name: string;
  auto_ingest: boolean;
  is_active: boolean;
  min_video_duration: number;
  max_video_duration: number | null;
  extraction_mode: string;
  anchor_emphasis: string;
  linked_anchor_ids: string[];
  custom_instructions: string | null;
}

interface YouTubeSettings {
  youtube_api_key: string | null;
}

interface VideoFromRSS {
  video_id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  published_at: string;
  description: string | null;
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

function verifyCronAuth(req: VercelRequest): boolean {
  // Vercel sets x-vercel-signature automatically for cron jobs
  if (req.headers['x-vercel-signature']) return true;

  // Manual trigger with CRON_SECRET
  if (!CRON_SECRET) return true; // dev mode: allow all
  const auth = req.headers['authorization'];
  if (auth && auth === `Bearer ${CRON_SECRET}`) return true;

  return false;
}

// ─── RSS PARSING ───────────────────────────────────────────────────────────────

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchChannelVideosFromRSS(channelId: string): Promise<VideoFromRSS[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Synapse/1.0)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} for channel ${channelId}`);
  }

  const xml = await response.text();
  const videos: VideoFromRSS[] = [];

  const entryPattern = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryPattern.exec(xml)) !== null) {
    const entry = entryMatch[1] ?? '';

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const descMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);

    if (!videoIdMatch?.[1] || !titleMatch?.[1]) continue;

    const videoId = videoIdMatch[1].trim();
    const title = decodeHTMLEntities(titleMatch[1].trim());
    const publishedAt = publishedMatch?.[1]?.trim() ?? new Date().toISOString();
    const description = descMatch?.[1]
      ? decodeHTMLEntities(descMatch[1].trim()).substring(0, 500)
      : null;

    videos.push({
      video_id: videoId,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      published_at: publishedAt,
      description,
    });
  }

  return videos;
}

// ─── DURATION: HTML FALLBACK ────────────────────────────────────────────────────

async function getVideoDurationFromPage(videoId: string): Promise<number | null> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Multiple regex patterns from V1
    const patterns = [
      /\"lengthSeconds\":\"(\d+)\"/,
      /\"approxDurationMs\":\"(\d+)\"/,
      /"duration":"PT(\d+)M(\d+)S"/,
      /itemprop="duration" content="PT(\d+)M(\d+)S"/,
    ];

    // Pattern 1: lengthSeconds
    const m1 = html.match(patterns[0]!);
    if (m1?.[1]) return parseInt(m1[1], 10);

    // Pattern 2: approxDurationMs
    const m2 = html.match(patterns[1]!);
    if (m2?.[1]) return Math.floor(parseInt(m2[1], 10) / 1000);

    // Patterns 3 & 4: PT#M#S
    for (const pattern of [patterns[2]!, patterns[3]!]) {
      const m = html.match(pattern);
      if (m?.[1] && m?.[2]) {
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── DURATION: YOUTUBE DATA API ────────────────────────────────────────────────

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchVideoDurationsFromAPI(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, number | null>> {
  const durationMap = new Map<string, number | null>();
  if (videoIds.length === 0) return durationMap;

  // Batch in groups of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: batch.join(','),
      key: apiKey,
    });

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        console.warn(`[poll] YouTube API error: ${response.status}`);
        batch.forEach(id => durationMap.set(id, null));
        continue;
      }

      const data = await response.json() as {
        items?: Array<{ id: string; contentDetails: { duration: string } }>;
      };

      for (const item of data.items ?? []) {
        const seconds = parseISO8601Duration(item.contentDetails.duration);
        durationMap.set(item.id, seconds > 0 ? seconds : null);
      }

      // Any IDs not returned by API
      batch.forEach(id => {
        if (!durationMap.has(id)) durationMap.set(id, null);
      });
    } catch (err) {
      console.warn(`[poll] Duration batch fetch failed:`, err);
      batch.forEach(id => durationMap.set(id, null));
    }
  }

  return durationMap;
}

// ─── HANDLER ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const startTime = Date.now();
  const supabase = getSupabase();

  const summary = {
    channelsPolled: 0,
    newVideosQueued: 0,
    errors: [] as string[],
  };

  try {
    // Fetch all active channels with auto_ingest enabled
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('is_active', true)
      .eq('auto_ingest', true);

    if (channelsError) {
      return res.status(500).json({ error: channelsError.message });
    }

    if (!channels || channels.length === 0) {
      return res.status(200).json({
        success: true,
        channelsPolled: 0,
        newVideosQueued: 0,
        errors: [],
        duration_ms: Date.now() - startTime,
      });
    }

    // Group channels by user to fetch API keys once per user
    const channelsByUser = new Map<string, YouTubeChannel[]>();
    for (const ch of channels as YouTubeChannel[]) {
      const list = channelsByUser.get(ch.user_id) ?? [];
      list.push(ch);
      channelsByUser.set(ch.user_id, list);
    }

    for (const [userId, userChannels] of channelsByUser) {
      // Resolve YouTube API key: env var → user's personal key
      let youtubeApiKey: string | null = YOUTUBE_API_KEY_ENV ?? null;
      if (!youtubeApiKey) {
        const { data: settings } = await supabase
          .from('youtube_settings')
          .select('youtube_api_key')
          .eq('user_id', userId)
          .maybeSingle();
        youtubeApiKey = (settings as YouTubeSettings | null)?.youtube_api_key ?? null;
      }

      // Get existing queue video IDs for this user (to deduplicate)
      const { data: existingQueue } = await supabase
        .from('youtube_ingestion_queue')
        .select('video_id')
        .eq('user_id', userId);

      const existingVideoIds = new Set(
        (existingQueue ?? []).map((q: { video_id: string }) => q.video_id)
      );

      for (const channel of userChannels) {
        const channelStart = Date.now();
        let videosFound = 0;
        let videosAdded = 0;
        let videosSkipped = 0;

        try {
          // Fetch RSS feed
          const rssVideos = await fetchChannelVideosFromRSS(channel.channel_id);
          videosFound = rssVideos.length;

          // Filter out already-queued videos
          const newVideos = rssVideos.filter(v => !existingVideoIds.has(v.video_id));
          videosSkipped = rssVideos.length - newVideos.length;

          if (newVideos.length > 0) {
            const minDuration = channel.min_video_duration ?? DEFAULT_MIN_DURATION;
            const maxDuration = channel.max_video_duration ?? DEFAULT_MAX_DURATION;

            // Resolve durations
            let durationMap: Map<string, number | null>;
            const newVideoIds = newVideos.map(v => v.video_id);

            if (youtubeApiKey) {
              durationMap = await fetchVideoDurationsFromAPI(newVideoIds, youtubeApiKey);
            } else {
              // Fallback: fetch each page individually (slower)
              durationMap = new Map();
              for (const videoId of newVideoIds) {
                const dur = await getVideoDurationFromPage(videoId);
                durationMap.set(videoId, dur);
              }
            }

            // Apply duration filters
            const filteredVideos = newVideos.filter(v => {
              const duration = durationMap.get(v.video_id);
              if (duration === null || duration === undefined) {
                // Without API key: include unknowns. With API key: exclude.
                return !youtubeApiKey;
              }
              if (duration < minDuration) return false;
              if (maxDuration !== null && duration > maxDuration) return false;
              return true;
            });

            videosSkipped += newVideos.length - filteredVideos.length;

            // Queue qualifying videos
            if (filteredVideos.length > 0) {
              const queueItems = filteredVideos.map(v => ({
                user_id: userId,
                channel_id: channel.id,
                video_id: v.video_id,
                video_title: v.title,
                video_url: v.url,
                thumbnail_url: v.thumbnail_url,
                published_at: v.published_at,
                duration_seconds: durationMap.get(v.video_id) ?? null,
                status: 'pending',
                priority: 5,
              }));

              const { data: inserted, error: insertError } = await supabase
                .from('youtube_ingestion_queue')
                .upsert(queueItems, { onConflict: 'user_id,video_id', ignoreDuplicates: true })
                .select('id');

              if (insertError) {
                console.error(`[poll] Insert error for channel ${channel.channel_id}:`, insertError);
                summary.errors.push(`Channel ${channel.channel_name}: ${insertError.message}`);
              } else {
                videosAdded = inserted?.length ?? 0;
                summary.newVideosQueued += videosAdded;
                // Track new video IDs for subsequent channels
                filteredVideos.forEach(v => existingVideoIds.add(v.video_id));
              }
            }
          }

          // Update last_checked_at
          await supabase
            .from('youtube_channels')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', channel.id);

          summary.channelsPolled++;

          // Log scan history
          await supabase.from('youtube_scan_history').insert({
            user_id: userId,
            channel_id: channel.id,
            scan_type: 'auto_poll',
            channel_name: channel.channel_name,
            videos_found: videosFound,
            videos_added: videosAdded,
            videos_skipped: videosSkipped,
            videos_processed: 0,
            videos_failed: 0,
            status: 'completed',
            started_at: new Date(channelStart).toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - channelStart,
          });

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[poll] Channel ${channel.channel_name} error:`, err);
          summary.errors.push(`${channel.channel_name}: ${msg}`);

          await supabase.from('youtube_scan_history').insert({
            user_id: userId,
            channel_id: channel.id,
            scan_type: 'auto_poll',
            channel_name: channel.channel_name,
            videos_found: videosFound,
            videos_added: 0,
            videos_skipped: videosSkipped,
            videos_processed: 0,
            videos_failed: 0,
            status: 'failed',
            error_message: msg,
            started_at: new Date(channelStart).toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - channelStart,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      ...summary,
      duration_ms: Date.now() - startTime,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[poll] Fatal error:', err);
    return res.status(500).json({ success: false, error: msg, duration_ms: Date.now() - startTime });
  }
}
