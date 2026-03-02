export interface YouTubePlaylist {
  id: string
  user_id: string
  playlist_id: string
  playlist_url: string
  playlist_name: string | null
  synapse_code: string | null
  linked_anchor_ids: string[]
  extraction_mode: string
  anchor_emphasis: string
  custom_instructions: string | null
  known_video_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface YouTubeVideo {
  video_id: string
  video_title: string
  video_url: string
  thumbnail_url: string | null
  published_at: string | null
  duration_seconds?: number
  status?: 'pending' | 'fetching_transcript' | 'extracting' | 'completed' | 'failed' | 'skipped'
  source_id?: string | null
  nodes_created?: number
  edges_created?: number
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
}

export interface PlaylistSettings {
  extraction_mode: string
  anchor_emphasis: string
  linked_anchor_ids: string[]
  custom_instructions: string | null
}
