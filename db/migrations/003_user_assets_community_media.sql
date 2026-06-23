CREATE TABLE IF NOT EXISTS user_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INT NOT NULL DEFAULT 0,
  url TEXT NOT NULL DEFAULT '',
  storage_provider TEXT NOT NULL DEFAULT 'local',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS size_bytes INT NOT NULL DEFAULT 0;

ALTER TABLE user_assets DROP CONSTRAINT IF EXISTS chk_user_assets_type;

ALTER TABLE user_assets
  ADD CONSTRAINT chk_user_assets_type
  CHECK (asset_type IN ('avatar', 'share_poster', 'route_preview', 'qr_card', 'community_media'));
