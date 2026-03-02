-- Add playlist_id to youtube_ingestion_queue so each queued video can be
-- traced back to the specific playlist that triggered its ingestion.
--
-- poll-playlist.ts will now write this column when inserting queue rows,
-- enabling per-playlist filtering in the Automate detail panel.

ALTER TABLE youtube_ingestion_queue
  ADD COLUMN IF NOT EXISTS playlist_id UUID REFERENCES youtube_playlists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_youtube_ingestion_queue_playlist_id
  ON youtube_ingestion_queue (playlist_id);
