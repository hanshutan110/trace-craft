ALTER TABLE user_assets DROP CONSTRAINT IF EXISTS chk_user_assets_type;

ALTER TABLE user_assets
  ADD CONSTRAINT chk_user_assets_type
  CHECK (asset_type IN ('avatar', 'share_poster', 'route_preview', 'qr_card', 'community_media'));
