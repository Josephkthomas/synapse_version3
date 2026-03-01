export interface IntegrationStatus {
  id: string
  name: string
  description: string
  status: 'active' | 'idle' | 'error'
  metric: string
  metricValue: number
}

export interface QueueItem {
  id: string
  user_id: string
  channel_id: string | null
  video_id: string
  video_title: string | null
  video_url: string
  thumbnail_url: string | null
  published_at: string | null
  duration_seconds: number | null
  status: 'pending' | 'fetching_transcript' | 'extracting' | 'completed' | 'failed' | 'skipped'
  priority: number
  transcript: string | null
  transcript_language: string | null
  transcript_fetched_at: string | null
  source_id: string | null
  nodes_created: number
  edges_created: number
  error_message: string | null
  retry_count: number
  max_retries: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export type QueueStatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed'

export interface ScanHistoryEntry {
  id: string
  user_id: string
  channel_id: string | null
  scan_type: 'manual_scan' | 'auto_poll' | 'process'
  channel_name: string | null
  videos_found: number
  videos_added: number
  videos_skipped: number
  videos_processed: number
  videos_failed: number
  status: 'completed' | 'failed' | 'partial'
  error_message: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  created_at: string
}

export interface YouTubeChannel {
  id: string
  user_id: string
  channel_id: string
  channel_name: string
  channel_url: string
  thumbnail_url: string | null
  description: string | null
  subscriber_count: number | null
  auto_ingest: boolean
  extraction_mode: string
  anchor_emphasis: string
  linked_anchor_ids: string[]
  custom_instructions: string | null
  min_video_duration: number
  max_video_duration: number | null
  last_checked_at: string | null
  last_video_published_at: string | null
  total_videos_ingested: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface YouTubeSettings {
  id: string
  user_id: string
  apify_api_key: string | null
  default_auto_ingest: boolean
  default_extraction_mode: string
  default_anchor_emphasis: string
  max_concurrent_extractions: number
  max_videos_per_channel: number
  daily_video_limit: number
  videos_ingested_today: number
  daily_limit_reset_at: string | null
  created_at: string
  updated_at: string
}

export interface AutomationSummary {
  youtube: {
    channelCount: number
    activeChannelCount: number
    totalVideosIngested: number
    playlistCount: number
    activePlaylistCount: number
    totalPlaylistVideos: number
  }
  meetings: {
    totalMeetings: number
    circlebackConnected: boolean
  }
  extension: {
    captureCount: number
    connected: boolean
  }
  queue: {
    pending: number
    processing: number
    completed: number
    failed: number
    lastCompletedAt: string | null
  }
}
