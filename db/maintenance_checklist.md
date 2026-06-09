# 数据库维护单（v0）

说明：该文件用于后续交付和纠错时直接检查/修复，不与应用启动脚本混写。

## 一、上线前检查（第一批）

### 1. 表结构检查

- 核对管理员表是否已建：  
  - `\dt admin_users admin_roles admin_user_roles admin_sessions admin_audit_logs admin_contents admin_templates admin_template_histories community_posts community_reports`
- 检查核心字段索引：  
  - `admin_users.status`  
  - `admin_templates(category,is_active,sort_order)`  
  - `admin_contents(content_type,status,updated_at)`  
  - `admin_audit_logs(created_at)`

### 2. 约束与状态值检查

- `admin_users.status` 是否仅允许 `active/disabled/locked`  
- `admin_contents.status` 是否仅允许 `draft/published/archived`  
- `community_posts` 状态值是否在预设范围  
- `admin_templates` 是否存在重复 `template_code`

## 二、数据质量修复（可执行 SQL）

### 1) 清理空角色绑定

```sql
DELETE FROM admin_user_roles
WHERE admin_user_id NOT IN (SELECT id FROM admin_users)
   OR admin_role_id NOT IN (SELECT id FROM admin_roles);
```

### 2) 修复模板默认值冲突（同类目只允许一个默认）

```sql
WITH bad AS (
  SELECT category, id
  FROM (
    SELECT category, id,
           ROW_NUMBER() OVER (PARTITION BY category ORDER BY is_default DESC, updated_at DESC, id) AS rn
    FROM admin_templates
    WHERE is_default = true
  ) t
  WHERE rn > 1
)
UPDATE admin_templates
SET is_default = false
WHERE id IN (SELECT id FROM bad);
```

### 3) 修复管理员密码为空的异常账户

```sql
UPDATE admin_users
SET status = 'disabled'
WHERE password_hash IS NULL OR LENGTH(password_hash) < 10;
```

## 三、审计与安全修复

### 1) 检查长期未过期 session

```sql
SELECT admin_user_id, COUNT(*) AS active_sessions
FROM admin_sessions
WHERE revoked_at IS NULL AND expires_at < NOW()
GROUP BY admin_user_id;
```

### 2) 处理过期 session（置为回收）

```sql
UPDATE admin_sessions
SET revoked_at = NOW()
WHERE revoked_at IS NULL AND expires_at < NOW();
```

### 3) 高频失败登录可疑账号（需接入失败计数字段后再开启）

目前表未建失败计数字段，建议后续追加：
`fail_count`、`locked_until`，配合 `admin_users.status` 落地锁定策略。

## 四、发布回滚建议

- 回滚点优先：  
  1) 先禁用新加表写入：`SET session_replication_role = replica`（仅特殊运维场景）  
  2) 回滚 Admin 模块配置：将 `admin_audit_logs` 与 `admin_sessions` 保留，但停止相关路由调用  
- 数据回滚方式：  
  - 删除模板/内容变更应走 SQL：先备份 JSON 字段快照，再执行 `DELETE` 或状态下线，避免丢数据  

## 五、与现有 TraceCraft 数据库关系说明

- 现有跑步链路表（`users/routes/run_sessions`）不依赖本次后台表，可独立运行  
- 如需管理员审查某条跑步记录，优先基于 `run_sessions.route_id` / `run_sessions.id` 做读透
