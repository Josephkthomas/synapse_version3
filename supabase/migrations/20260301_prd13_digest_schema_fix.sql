-- PRD 13: Add missing columns to digest_profiles table
-- These columns were omitted when the table was created manually.

ALTER TABLE digest_profiles
  ADD COLUMN IF NOT EXISTS schedule_time  TIME    NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();
