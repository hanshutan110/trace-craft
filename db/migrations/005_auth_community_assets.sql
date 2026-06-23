-- Migration 005: 集中创建认证、推送、社区等表结构和索引
-- 原先散落在 authService、pushService 等业务代码中的 CREATE TABLE IF NOT EXISTS
-- 统一迁移到此处，保证幂等性

-- ===== 认证身份表 =====
CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);

-- ===== 推送 Token 表 =====
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  device_id TEXT,
  push_token TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'capacitor',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, push_token)
);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id);

-- ===== 社区帖子表 =====
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  route_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  media_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);

-- ===== 社区评论表 =====
CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  parent_comment_id TEXT REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);

-- ===== 社区互动（点赞/收藏） =====
CREATE TABLE IF NOT EXISTS community_reactions (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_id, user_id, reaction_type)
);

-- ===== 用户关注 =====
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- ===== 通知表 =====
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  target_type TEXT,
  target_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 用户收藏 =====
CREATE TABLE IF NOT EXISTS user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- ===== 用户反馈 =====
CREATE TABLE IF NOT EXISTS user_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contact TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 社区举报 =====
CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'spam',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 路线模板 =====
CREATE TABLE IF NOT EXISTS route_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'route',
  shape_type TEXT NOT NULL DEFAULT 'star',
  distance_km DOUBLE PRECISION NOT NULL DEFAULT 0,
  preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 搜索历史 & 热搜 =====
CREATE TABLE IF NOT EXISTS user_search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all',
  hit_count INT NOT NULL DEFAULT 1,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, scope, keyword)
);

CREATE TABLE IF NOT EXISTS search_hot_keywords (
  keyword TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'all',
  search_count INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 用户资源 =====
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
CREATE INDEX IF NOT EXISTS idx_user_assets_user ON user_assets(user_id);

-- ===== 社区媒体 =====
CREATE TABLE IF NOT EXISTS community_media (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 分享记录 =====
CREATE TABLE IF NOT EXISTS route_share_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  route_id TEXT,
  session_id TEXT,
  channel TEXT NOT NULL DEFAULT 'poster',
  share_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_route_share_records_user ON route_share_records(user_id);

-- ===== JSONB GIN 索引（提升 JSONB 字段搜索性能） =====
CREATE INDEX IF NOT EXISTS idx_routes_payload_gin ON routes USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_routes_shape_type ON routes ((payload->>'shapeType'));
