-- TraceCraft MVP 完整数据库 Schema
-- 目标：覆盖当前项目已使用和即将使用的全部 PostgreSQL 表，可用于空库初始化或已有库补齐。
-- 适用数据库：PostgreSQL 14+
-- 执行特点：全部使用 CREATE TABLE/INDEX IF NOT EXISTS 或 INSERT ... ON CONFLICT，重复执行安全。
-- 注意：后端 PostgresStorage 仍会在启动时自动补齐核心表；本文件用于集中维护完整结构。

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===== 0. 核心用户 / 路线 / 跑步会话 =====
-- 对应后端 PostgresStorage 自动创建的主链路表。

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

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

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_revoked_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  anchor_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS route_versions (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, version)
);

CREATE TABLE IF NOT EXISTS run_sessions (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  cursor INT NOT NULL DEFAULT 0,
  current_accuracy DOUBLE PRECISION,
  deviation_score DOUBLE PRECISION DEFAULT 0,
  path_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  idempotency_key TEXT,
  last_state_at TIMESTAMPTZ,
  location_sample JSONB NOT NULL DEFAULT '[]'::jsonb,
  actual_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS run_location_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES run_sessions(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, seq)
);

CREATE TABLE IF NOT EXISTS run_audit_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES run_sessions(id) ON DELETE SET NULL,
  route_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE routes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- ===== 1. 后台管理：人员 / 角色 / 内容 / 模板 =====
-- 对应 admin/ API 模式：用户管理、内容管理、模板管理。

CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permission_matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  CONSTRAINT chk_admin_users_status CHECK (status IN ('active', 'disabled', 'locked'))
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  admin_role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_user_role UNIQUE (admin_user_id, admin_role_id)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  actor_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  request_path TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_ip INET,
  user_agent TEXT,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_contents (
  id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  publish_at TIMESTAMPTZ,
  created_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by TEXT REFERENCES admin_users(id),
  CONSTRAINT uq_admin_contents_key_type UNIQUE (content_key, content_type),
  CONSTRAINT chk_admin_contents_status CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS admin_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider_hint TEXT,
  template_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT
);

CREATE TABLE IF NOT EXISTS admin_template_histories (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  payload_snapshot JSONB NOT NULL,
  changed_by TEXT REFERENCES admin_users(id),
  change_reason TEXT NOT NULL DEFAULT 'update',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_template_history UNIQUE (template_id, version)
);

-- ===== 2. 用户端模板库 / 快速模板 / 搜索结果 =====
-- 对应 HomeExtraScreens、DiscoveryScreens 的模板库、热门模板、模板详情。

CREATE TABLE IF NOT EXISTS route_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_en TEXT,
  category TEXT NOT NULL DEFAULT 'base',
  shape_type TEXT NOT NULL,
  distance_km NUMERIC(8,2),
  preview_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  usage_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_template_usage (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES route_templates(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ===== 3. 收藏 / 搜索 =====
-- 对应 FavoritesScreen、TemplateDetail 收藏按钮、Search/SearchResult。

CREATE TABLE IF NOT EXISTS user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_favorites_target_type CHECK (target_type IN ('route', 'template', 'post', 'user')),
  CONSTRAINT uq_user_favorite_target UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS user_search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all',
  hit_count INT NOT NULL DEFAULT 0,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_search_scope CHECK (scope IN ('all', 'route', 'template', 'user', 'post')),
  CONSTRAINT uq_user_search_keyword UNIQUE (user_id, scope, keyword)
);

CREATE TABLE IF NOT EXISTS search_hot_keywords (
  keyword TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'all',
  search_count INT NOT NULL DEFAULT 0,
  result_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== 4. 社区 / 分享 / 消息 =====
-- 对应 CommunityScreens：轨迹分享、广场、作品详情、评论、点赞、关注、通知。

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  content TEXT NOT NULL,
  content_en TEXT,
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  media_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  favorite_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT chk_community_posts_status CHECK (status IN ('pending', 'published', 'hidden', 'deleted')),
  CONSTRAINT chk_community_posts_review CHECK (review_status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS route_id TEXT REFERENCES routes(id) ON DELETE SET NULL;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS content_en TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS topic_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS media_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS favorite_count INT NOT NULL DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS share_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id TEXT REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_community_comments_status CHECK (status IN ('published', 'hidden', 'deleted'))
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_community_reactions_target CHECK (target_type IN ('post', 'comment')),
  CONSTRAINT chk_community_reactions_type CHECK (reaction_type IN ('like')),
  CONSTRAINT uq_community_reaction UNIQUE (target_type, target_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT REFERENCES admin_users(id),
  handled_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_community_reports_status CHECK (status IN ('open', 'closed'))
);

CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_follows_self CHECK (follower_id <> following_id),
  CONSTRAINT uq_user_follow UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  target_type TEXT,
  target_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_notifications_type CHECK (type IN ('like', 'comment', 'follow', 'system'))
);

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

CREATE TABLE IF NOT EXISTS route_share_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES run_sessions(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  share_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_route_share_channel CHECK (channel IN ('wechat', 'moments', 'xiaohongshu', 'douyin', 'poster', 'system'))
);

-- ===== 5. 用户资料扩展 / 反馈 =====
-- 对应头像、帮助与反馈、用户二维码名片。头像文件本身后续仍建议走 OSS/本地文件服务，表内只存 URL/元信息。

CREATE TABLE IF NOT EXISTS user_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'local',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_assets_type CHECK (asset_type IN ('avatar', 'share_poster', 'route_preview', 'qr_card', 'community_media'))
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  contact TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT REFERENCES admin_users(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_feedback_status CHECK (status IN ('open', 'processing', 'closed'))
);

-- ===== 索引 =====

CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_revoked_tokens_expires_at ON auth_revoked_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_routes_user_created ON routes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_routes_payload_id_trgm ON routes USING GIN (LOWER(payload->>'id') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_routes_payload_filename_trgm ON routes USING GIN (LOWER(COALESCE(payload->'source'->>'filename', '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_routes_payload_shape_trgm ON routes USING GIN (LOWER(COALESCE(payload->>'shapeType', '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON run_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON run_sessions(status);
CREATE INDEX IF NOT EXISTS idx_events_session_seq ON run_location_events(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_route_versions_route_id_version ON route_versions(route_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_user_idempotency ON run_sessions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_contents_type_status ON admin_contents(content_type, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_templates_cat_active ON admin_templates(category, is_active, sort_order, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_expires ON admin_sessions(admin_user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_templates_active_sort ON route_templates(category, is_active, sort_order, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_template_usage_template ON route_template_usage(template_id, used_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_type ON user_favorites(user_id, target_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_search_history_user ON user_search_history(user_id, last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_hot_keywords_scope ON search_hot_keywords(scope, search_count DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON community_posts(status, review_status, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_reactions_target ON community_reactions(target_type, target_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_active ON user_push_tokens(user_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_share_records_user ON route_share_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_assets_user_type ON user_assets(user_id, asset_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status, created_at DESC);

-- ===== 最小种子数据 =====

INSERT INTO admin_roles (id, code, name, description, permission_matrix)
VALUES
  ('role-admin', 'super_admin', '超级管理员', '系统全量管理权限', '{"*": true}'::jsonb),
  ('role-op', 'operator', '运营管理员', '内容、模板、社区基础运营', '{"users.read": true, "users.update_status": true, "contents.write": true, "templates.write": true, "community.review": true}'::jsonb),
  ('role-view', 'content_viewer', '内容查看', '只读查看', '{"users.read": true, "contents.read": true, "templates.read": true, "community.read": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO admin_users (id, username, password_hash, display_name, status, created_by)
VALUES ('admin-root', 'admin', 'password_login_disabled_until_admin_auth_ready', 'TraceCraft Admin', 'active', NULL)
ON CONFLICT (username) DO NOTHING;

INSERT INTO admin_user_roles (id, admin_user_id, admin_role_id, assigned_by)
VALUES ('admin-root-role-super', 'admin-root', 'role-admin', NULL)
ON CONFLICT (admin_user_id, admin_role_id) DO NOTHING;

INSERT INTO route_templates (id, template_code, title, title_en, category, shape_type, distance_km, preview_payload, generation_payload, is_featured, sort_order)
VALUES
  ('tpl-heart', 'heart', '爱心路线', 'Heart Route', 'base', 'heart', 4.20, '{"color":"rose"}'::jsonb, '{"shapeType":"heart"}'::jsonb, TRUE, 10),
  ('tpl-star', 'star', '星形挑战', 'Star Challenge', 'base', 'star', 5.00, '{"color":"yellow"}'::jsonb, '{"shapeType":"star"}'::jsonb, TRUE, 20),
  ('tpl-circle', 'circle', '环形路线', 'Circle Route', 'base', 'circle', 3.50, '{"color":"cyan"}'::jsonb, '{"shapeType":"circle"}'::jsonb, TRUE, 30),
  ('tpl-triangle', 'triangle', '三角冲刺', 'Triangle Sprint', 'base', 'triangle', 3.00, '{"color":"emerald"}'::jsonb, '{"shapeType":"triangle"}'::jsonb, FALSE, 40),
  ('tpl-square', 'square', '方形地图', 'Square Map', 'base', 'square', 4.00, '{"color":"blue"}'::jsonb, '{"shapeType":"square"}'::jsonb, FALSE, 50),
  ('tpl-hexagon', 'hexagon', '六边形路线', 'Hexagon Route', 'base', 'hexagon', 4.80, '{"color":"violet"}'::jsonb, '{"shapeType":"hexagon"}'::jsonb, FALSE, 60)
ON CONFLICT (template_code) DO NOTHING;

COMMIT;

-- ===== ���ⲹ�룺������ʷ migrations ����©�� =====
-- �������ڰ� migrations/003 �� migrations/004/005 �еĽṹ�������տڣ����ڵ��ļ���ʼ����
-- �� migrations ִ���߼�������ͻ���ظ�ִ��ʱ�����ݵ��ԡ�

CREATE TABLE IF NOT EXISTS community_media (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES community_posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_payload_gin
  ON routes USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_routes_shape_type
  ON routes ((payload->>'shapeType'));

CREATE INDEX IF NOT EXISTS idx_user_assets_user
  ON user_assets (user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user
  ON user_push_tokens (user_id);
