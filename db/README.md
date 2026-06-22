# TraceCraft 数据库说明

`db/` 只保留一个可执行主 schema 和一个维护说明文件，避免多份 SQL / API 草案互相过期。

## 文件

- [feature-precreate-schema.sql](feature-precreate-schema.sql)
  - MVP 完整 PostgreSQL schema。
  - 覆盖核心用户、路线、跑步会话、快捷登录身份、后台管理、模板库、收藏、搜索、社区、通知、分享、用户资产、反馈。
  - 适合空库初始化，也可对已有库补齐缺失表和索引。
  - SQL 使用 `CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS`、`INSERT ... ON CONFLICT`，重复执行相对安全。
- [migrations/](migrations/)
  - 增量 schema 迁移目录，文件名格式为 `001_xxx.sql`。
  - 后端启动默认执行未登记 migration，并写入 `schema_migrations`。
  - 可手动运行：`cd backend && npm run migrate`。
  - 本地调试如需跳过自动迁移，可设置 `TRACECRAFT_AUTO_MIGRATE=0`。

## 当前执行状态

- `feature-precreate-schema.sql` 已执行到 VM PostgreSQL：`192.168.252.128` / `tracecraft-postgres` / `tracecraft`。
- 后端 `PostgresStorage` 启动时仍会补齐核心主链路表；完整 schema 以本文件夹主 SQL 为准。
- 后续结构调整必须先确认目标环境、完整 SQL、影响范围、回滚方式。

## 管理后台 API

统一前缀：`/api/admin`。

鉴权：

- 主链路使用 HttpOnly Cookie 登录态。
- 服务端兼容 `Authorization: Bearer <admin_token>`。
- 用户端 token 与管理端 token 分离。
- 写接口已有基础角色拦截：`super_admin` 可写全部，`operator` 可写内容和模板，`content_viewer` 只读。

统一返回：

- 成功：`{ ok: true, ...payload }`
- 失败：`{ ok: false, code, error, status }`
- 分页：`{ ok: true, rows, total, page, limit }`

当前已实现接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | 管理员登录，写入 HttpOnly Cookie，返回 `admin` |
| `GET` | `/api/admin/auth/me` | 校验登录态，返回当前管理员 |
| `GET` | `/api/admin/roleLibrary` | 角色库只读列表 |
| `GET` | `/api/admin/users` | 管理员列表，支持 `page, limit, keyword, status, roleCode` |
| `POST` | `/api/admin/users` | 新增管理员 |
| `PUT` | `/api/admin/users/:id` | 更新管理员资料、角色、状态、密码 |
| `DELETE` | `/api/admin/users/:id` | 禁用管理员，保留记录和审计 |
| `GET` | `/api/admin/contents` | 内容列表，支持 `page, limit, keyword, status, type` |
| `POST` | `/api/admin/contents` | 新增内容 |
| `PUT` | `/api/admin/contents/:id` | 更新内容 |
| `DELETE` | `/api/admin/contents/:id` | 归档内容，保留记录和审计 |
| `GET` | `/api/admin/templates` | 模板列表，支持 `page, limit, keyword, status, category` |
| `POST` | `/api/admin/templates` | 新增模板 |
| `PUT` | `/api/admin/templates/:id` | 更新模板 |
| `DELETE` | `/api/admin/templates/:id` | 停用模板，保留记录和审计 |

## 上线前检查

表结构：

```sql
\dt users auth_identities routes route_versions run_sessions run_location_events run_audit_logs
\dt admin_users admin_roles admin_user_roles admin_sessions admin_audit_logs admin_contents admin_templates admin_template_histories
\dt route_templates user_favorites user_search_history search_hot_keywords community_posts community_comments community_reactions user_follows notifications
```

关键索引：

- `idx_routes_user_created`
- `idx_sessions_user_updated`
- `uq_sessions_user_idempotency`
- `idx_admin_users_status`
- `idx_admin_templates_cat_active`
- `idx_admin_contents_type_status`
- `idx_community_posts_feed`
- `idx_community_reactions_target`
- `idx_notifications_user_unread`

状态值：

- `admin_users.status` 只允许 `active/disabled/locked`
- `admin_contents.status` 只允许 `draft/published/archived`
- `community_posts.status` 只允许 `pending/published/hidden/deleted`
- `community_posts.review_status` 只允许 `pending/approved/rejected`

安全数据：

```sql
SELECT id, username, status
FROM admin_users
WHERE password_hash = 'password_login_disabled_until_admin_auth_ready'
   OR password_hash IS NULL
   OR LENGTH(password_hash) < 10;
```

上线前应处理掉占位密码账号，或仅在本地显式开启 `TRACECRAFT_ALLOW_ADMIN_PASSWORD_FALLBACK=1`。

初始管理员角色：

```sql
SELECT u.username, ARRAY_AGG(r.code ORDER BY r.code) AS roles
FROM admin_users u
LEFT JOIN admin_user_roles ur ON ur.admin_user_id = u.id
LEFT JOIN admin_roles r ON r.id = ur.admin_role_id
WHERE u.username = 'admin'
GROUP BY u.username;
```

`admin` 种子账号应至少绑定 `super_admin`。如缺失，可执行：

```sql
INSERT INTO admin_user_roles (id, admin_user_id, admin_role_id, assigned_by)
VALUES ('admin-root-role-super', 'admin-root', 'role-admin', NULL)
ON CONFLICT (admin_user_id, admin_role_id) DO NOTHING;
```

## 常用修复 SQL

清理空角色绑定：

```sql
DELETE FROM admin_user_roles
WHERE admin_user_id NOT IN (SELECT id FROM admin_users)
   OR admin_role_id NOT IN (SELECT id FROM admin_roles);
```

修复模板默认值冲突（同类目只允许一个默认）：

```sql
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY is_default DESC, updated_at DESC, id) AS rn
  FROM admin_templates
  WHERE is_default = true
)
UPDATE admin_templates
SET is_default = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

禁用异常管理员账号：

```sql
UPDATE admin_users
SET status = 'disabled', deactivated_at = NOW(), updated_at = NOW()
WHERE password_hash IS NULL OR LENGTH(password_hash) < 10;
```

检查过期 admin session：

```sql
SELECT admin_user_id, COUNT(*) AS expired_sessions
FROM admin_sessions
WHERE revoked_at IS NULL AND expires_at < NOW()
GROUP BY admin_user_id;
```

回收过期 admin session：

```sql
UPDATE admin_sessions
SET revoked_at = NOW()
WHERE revoked_at IS NULL AND expires_at < NOW();
```

## 回滚建议

- 结构变更前先备份目标表结构和关键数据。
- 内容、模板、用户状态类变更优先软回滚：恢复 `status`、`is_active`、`body_json`、`template_payload`。
- 删除模板/内容前先备份 JSON 字段快照。
- 高风险修复 SQL 必须先跑 `SELECT COUNT(*)` 或等价查询确认影响范围。

## 已整合历史文件

- `admin-schema.sql`：内容是完整 schema 的后台子集，已并入主 schema。
- `admin-api-design.md`：当前实现和接口说明已并入本文档。
- `maintenance_checklist.md`：维护检查和修复 SQL 已并入本文档。
- `schema_admin_minimal.sql`：空文件，已移除。
