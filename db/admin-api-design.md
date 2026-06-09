# 最小可行后台 API 设计清单（v0）

目标：先做“人员管理 / 内容管理 / 模板管理”三条主线，接口先满足后台最小闭环。  
接口建议按 `v1/admin` 命名，与现有公开 API 分离（例如 `v1/maps/config` 仍保留不变）。

## 约定

- 统一返回：  
  - 成功：`{ ok: true, data: ..., traceId }`
  - 失败：`{ ok: false, code, error, status }`
- 鉴权：管理端使用 `Authorization: Bearer <admin_token>`，与用户端分离。
- 幂等与审计：
  - 写操作记录到 `admin_audit_logs`
  - 涉及状态变更的接口返回 `version`（便于前端刷新提示）
- 分页返回：`{ total, page, limit, list }`

## 一、人员管理 API

### 1. 登录 / 退出 / 鉴权

- `POST /v1/admin/auth/login`
  - 入参：`{ username, password }`
  - 出参：`{ token, refreshToken, admin: { id, username, displayName, roles } }`
- `POST /v1/admin/auth/refresh`
  - 入参：`{ refreshToken }`
  - 出参：`{ token }`
- `POST /v1/admin/auth/logout`
  - 入参：`{ refreshToken }`
- `GET /v1/admin/auth/me`
  - 返回当前登录人信息、角色、权限矩阵

### 2. 管理员用户

- `GET /v1/admin/users`
  - 查询参数：`page, limit, keyword, status, roleCode`
  - 说明：支持用户列表、关键字（用户名/手机号）筛选
- `GET /v1/admin/users/:id`
- `POST /v1/admin/users`
  - 入参：`{ username, displayName, phone, email, roleIds, password, status }`
- `PUT /v1/admin/users/:id`
  - 入参：`{ displayName, phone, email, roleIds, status }`
- `PATCH /v1/admin/users/:id/password`
  - 入参：`{ password }`（仅超级管理员可操作）
- `PATCH /v1/admin/users/:id/status`
  - 入参：`{ status: active|disabled|locked }`
- `DELETE /v1/admin/users/:id`
  - 说明：软删除更稳妥（`status=deleted`），若做物理删需二次确认

### 3. 角色 / 权限

- `GET /v1/admin/roles`
- `POST /v1/admin/roles`
  - 入参：`{ code, name, description, permissionMatrix }`
- `PUT /v1/admin/roles/:id`
- `PATCH /v1/admin/roles/:id/active`
  - 入参：`{ isActive }`

## 二、信息管理（内容管理）API

### 4. 内容项（公告、帮助页、FAQ、说明文案）

- `GET /v1/admin/contents`
  - 查询参数：`type, status, keyword, page, limit`
  - type 例如：`announcement|help|faq|policy|notice`
- `GET /v1/admin/contents/:id`
- `POST /v1/admin/contents`
  - 入参：`{ key, type, title, summary, body, status, sortOrder }`
- `PUT /v1/admin/contents/:id`
- `PATCH /v1/admin/contents/:id/publish`
  - 入参：`{ status: published|archived|draft }`
- `DELETE /v1/admin/contents/:id`

### 5. 内容变更历史（建议）

- `GET /v1/admin/contents/:id/audit`
  - 返回内容更新历史（若后续补充版本表可对接）

## 三、地图模板管理 API

### 6. 模板管理

- `GET /v1/admin/templates`
  - 查询参数：`category, providerHint, isActive, keyword, page, limit`
  - category 例如：`map|route|ui`
- `GET /v1/admin/templates/:id`
- `POST /v1/admin/templates`
  - 入参：`{ templateCode, templateName, category, providerHint, payload, isDefault, isActive, sortOrder }`
- `PUT /v1/admin/templates/:id`
- `PATCH /v1/admin/templates/:id/default`
  - 入参：`{ isDefault }`（同 category 下唯一）
- `PATCH /v1/admin/templates/:id/active`
  - 入参：`{ isActive }`
- `DELETE /v1/admin/templates/:id`

## 四、社区管理（可选扩展，但建议同期开工）

### 7. 社区帖子审核

- `GET /v1/admin/community/posts`
  - 查询参数：`status, reviewStatus, keyword, page, limit`
- `GET /v1/admin/community/posts/:id`
- `PATCH /v1/admin/community/posts/:id/review`
  - 入参：`{ reviewStatus: approved|rejected, reason }`
- `PATCH /v1/admin/community/posts/:id/visibility`
  - 入参：`{ status: hidden|published }`

### 8. 举报工单

- `GET /v1/admin/community/reports`
  - 查询参数：`status, page, limit`
- `PATCH /v1/admin/community/reports/:id`
  - 入参：`{ status: closed, actionTaken, handledBy }`

## 五、推荐实现顺序（最小可行）

1. 管理员账号 + 角色 + 登录鉴权  
2. 人员列表 + 状态控制 + 审计日志  
3. 信息内容（公告）  
4. 模板管理（先 map/category）  
5. 社区管理（审核、隐藏）  

## 六、错误码（建议）

- `ADMIN_VALIDATION_FAIL`：参数校验失败  
- `ADMIN_AUTH_FAIL`：鉴权失败  
- `ADMIN_FORBIDDEN`：权限不足  
- `ADMIN_NOT_FOUND`：对象不存在  
- `ADMIN_DUPLICATE`：唯一键冲突（如角色码、模板编码）  
- `ADMIN_NOT_YET`：操作不允许（如正在运行任务时的状态问题）
