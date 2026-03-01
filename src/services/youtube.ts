import type { YouTubeVideo } from '../types/youtube'

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined

// --- URL Parsing ---

const PLAYLIST_URL_PATTERNS = [
  /[?&]list=(PL[\w-]+)/,                    // Standard playlist URL with list param
  /youtube\.com\/playlist\?list=(PL[\w-]+)/, // Direct playlist URL
  /^(PL[\w-]{10,})$/,                        // Raw playlist ID
]

export function parsePlaylistUrl(url: string): string | null {
  const trimmed = url.trim()
  for (const pattern of PLAYLIST_URL_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

// --- SYN Code Generation ---

export function generateSynapseCode(): string {
  const chars = '0123456789ABCDEF'
  let code = 'SYN-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// --- Playlist Metadata ---

export async function fetchPlaylistMetadata(
  playlistId: string
): Promise<{ name: string; videoCount: number; thumbnailUrl?: string } | null> {
  if (!YOUTUBE_API_KEY) return null

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
    )

    if (!response.ok) return null

    const data = await response.json()
    const item = data.items?.[0]
    if (!item) return null

    return {
      name: item.snippet.title,
      videoCount: item.contentDetails.itemCount,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url,
    }
  } catch (err) {
    console.warn('[youtube] Failed to fetch playlist metadata:', err)
    return null
  }
}

// --- Playlist Videos ---

export async function fetchPlaylistVideos(
  playlistId: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) return []

  const videos: YouTubeVideo[] = []
  let pageToken: string | undefined

  try {
    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      url.searchParams.set('part', 'snippet,contentDetails')
      url.searchParams.set('playlistId', playlistId)
      url.searchParams.set('maxResults', '50')
      url.searchParams.set('key', YOUTUBE_API_KEY)
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const response = await fetch(url.toString())
      if (!response.ok) break

      const data = await response.json()
      for (const item of data.items ?? []) {
        videos.push({
          video_id: item.contentDetails.videoId,
          video_title: item.snippet.title,
          video_url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
          thumbnail_url: item.snippet.thumbnails?.medium?.url ?? null,
          published_at: item.contentDetails.videoPublishedAt ?? null,
        })
      }

      pageToken = data.nextPageToken
    } while (pageToken && videos.length < maxResults)
  } catch (err) {
    console.warn('[youtube] Failed to fetch playlist videos:', err)
  }

  return videos.slice(0, maxResults)
}

// --- API Key Check ---

export function hasYouTubeApiKey(): boolean {
  return !!YOUTUBE_API_KEY
}
