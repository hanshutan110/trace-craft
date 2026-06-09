-- TraceCraft 最小可行后台（人员/内容/模板）数据库草案
-- 目标：独立管理后台元数据，不破坏现有用户跑步链路表(users/routes/run_sessions/...)
-- 兼容现状：基于 PostgreSQL（与 backend/src/services/storage.js 中 postgres schema 保持一致风格）

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
  created_by TEXT NOT NULL REFERENCES admin_users(id),
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
  created_by TEXT NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT
);

CREATE TABLE IF NOT EXISTS admin_template_histories (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES admin_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  payload_snapshot JSONB NOT NULL,
  changed_by TEXT NOT NULL REFERENCES admin_users(id),
  change_reason TEXT NOT NULL DEFAULT 'update',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_template_history UNIQUE (template_id, version)
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT chk_community_posts_status CHECK (status IN ('pending', 'published', 'hidden', 'deleted')),
  CONSTRAINT chk_community_posts_review CHECK (review_status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT REFERENCES admin_users(id),
  handled_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_community_reports_status CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_contents_type_status ON admin_contents(content_type, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_templates_cat_active ON admin_templates(category, is_active, sort_order, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_expires ON admin_sessions(admin_user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_review ON community_posts(review_status, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status, created_at DESC);

-- 回填最小角色（建议先执行）
INSERT INTO admin_roles (id, code, name, description, permission_matrix)
VALUES
  ('role-admin', 'super_admin', '超级管理员', '系统全量管理权限', '{"*": true}'::jsonb),
  ('role-op', 'operator', '运营管理员', '内容、模板、社区基础运营', '{"users.read": true, "users.update_status": true, "contents.write": true, "templates.write": true, "community.review": true}'),
  ('role-view', 'content_viewer', '内容查看', '只读查看', '{"users.read": true, "contents.read": true, "templates.read": true, "community.read": true}')
ON CONFLICT (code) DO NOTHING;

-- 回填超级管理员账号样例（password_hash 请换成真实 hash）
INSERT INTO admin_users (id, username, password_hash, display_name, status, created_by)
VALUES ('admin-root', 'admin', '$2y$12$placeholder_hash_need_replace', 'TraceCraft Admin', 'active', NULL)
ON CONFLICT (username) DO NOTHING;
