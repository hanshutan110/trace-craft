# 后台 API 设计清单（v0）

目标：先做“人员管理 / 内容管理 / 模板管理”三条主线，接口先满足后台最小闭环。  
当前实现沿用项目统一前缀 `/api/admin`；后续如引入公开版本化 API，可再迁移到 `/api/v1/admin` 或 `/v1/admin`。

## 约定

- 统一返回：  
  - 当前实现成功：`{ ok: true, ...payload }`
  - 失败：`{ ok: false, code, error, status }`
- 鉴权：管理端使用 `Authorization: Bearer <admin_token>`，与用户端 token 分离。
- 当前登录：MVP 使用 `TRACECRAFT_ADMIN_PASSWORD` 校验口令，并签发 HMAC token。
- 上线前必须替换为完整 `admin_users.password_hash` 校验、会话刷新和权限矩阵。
- 幂等与审计：
  - 写操作记录到 `admin_audit_logs`
  - 涉及状态变更的接口后续建议返回 `version`（便于前端刷新提示）
- 分页返回：`{ ok: true, rows, total, page, limit }`

## 当前已实现接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | 管理员 MVP 登录，返回 `token` 和 `admin` |
| `GET` | `/api/admin/auth/me` | 校验 token，返回当前管理员 |
| `GET` | `/api/admin/roleLibrary` | 角色库只读列表 |
| `GET` | `/api/admin/users` | 管理员列表，支持 `page, limit, keyword, status, roleCode` |
| `POST` | `/api/admin/users` | 新增管理员 |
| `PUT` | `/api/admin/users/:id` | 更新管理员资料、角色、状态 |
| `DELETE` | `/api/admin/users/:id` | 禁用管理员，保留记录和审计 |
| `GET` | `/api/admin/contents` | 内容列表，支持 `page, limit, keyword, status, type` |
| `POST` | `/api/admin/contents` | 新增内容 |
| `PUT` | `/api/admin/contents/:id` | 更新内容 |
| `DELETE` | `/api/admin/contents/:id` | 归档内容，保留记录和审计 |
| `GET` | `/api/admin/templates` | 模板列表，支持 `page, limit, keyword, status, category` |
| `POST` | `/api/admin/templates` | 新增模板 |
| `PUT` | `/api/admin/templates/:id` | 更新模板 |
| `DELETE` | `/api/admin/templates/:id` | 停用模板，保留记录和审计 |

## 当前管理端工程

- 目录：`admin/`
- 技术栈：Vite + React + TypeScript + Ant Design
- 启动：`cd admin && npm install && npm run dev`
- 默认地址：`http://localhost:3002`
- API Base：`VITE_ADMIN_API_BASE_URL`，默认 `http://localhost:3001/api`

## 一、人员管理 API

### 1. 登录 / 退出 / 鉴权

- `POST /api/admin/auth/login`
  - 入参：`{ username, password }`
  - 当前出参：`{ ok: true, token, admin: { id, username, displayName, roles } }`
  - 后续正式版出参建议：`{ token, refreshToken, admin: { id, username, displayName, roles, permissions } }`
- `POST /api/admin/auth/refresh`
  - 入参：`{ refreshToken }`
  - 出参：`{ token }`
- `POST /api/admin/auth/logout`
  - 入参：`{ refreshToken }`
- `GET /api/admin/auth/me`
  - 返回当前登录人信息、角色、权限矩阵

### 2. 管理员用户

- `GET /api/admin/users`
  - 查询参数：`page, limit, keyword, status, roleCode`
  - 说明：支持用户列表、关键字（用户名/手机号）筛选
- `GET /api/admin/users/:id`
- `POST /api/admin/users`
  - 入参：`{ username, displayName, phone, email, roleIds, password, status }`
- `PUT /api/admin/users/:id`
  - 入参：`{ displayName, phone, email, roleIds, status }`
- `PATCH /api/admin/users/:id/password`
  - 入参：`{ password }`（仅超级管理员可操作）
- `PATCH /api/admin/users/:id/status`
  - 入参：`{ status: active|disabled|locked }`
- `DELETE /api/admin/users/:id`
  - 说明：软删除更稳妥（`status=deleted`），若做物理删需二次确认

### 3. 角色 / 权限

- `GET /api/admin/roles`
- `POST /api/admin/roles`
  - 入参：`{ code, name, description, permissionMatrix }`
- `PUT /api/admin/roles/:id`
- `PATCH /api/admin/roles/:id/active`
  - 入参：`{ isActive }`

## 二、信息管理（内容管理）API

### 4. 内容项（公告、帮助页、FAQ、说明文案）

- `GET /api/admin/contents`
  - 查询参数：`type, status, keyword, page, limit`
  - type 例如：`announcement|help|faq|policy|notice`
- `GET /api/admin/contents/:id`
- `POST /api/admin/contents`
  - 入参：`{ key, type, title, summary, body, status, sortOrder }`
- `PUT /api/admin/contents/:id`
- `PATCH /api/admin/contents/:id/publish`
  - 入参：`{ status: published|archived|draft }`
- `DELETE /api/admin/contents/:id`

### 5. 内容变更历史（建议）

- `GET /api/admin/contents/:id/audit`
  - 返回内容更新历史（若后续补充版本表可对接）

## 三、地图模板管理 API

### 6. 模板管理

- `GET /api/admin/templates`
  - 查询参数：`category, providerHint, isActive, keyword, page, limit`
  - category 例如：`map|route|ui`
- `GET /api/admin/templates/:id`
- `POST /api/admin/templates`
  - 入参：`{ templateCode, templateName, category, providerHint, payload, isDefault, isActive, sortOrder }`
- `PUT /api/admin/templates/:id`
- `PATCH /api/admin/templates/:id/default`
  - 入参：`{ isDefault }`（同 category 下唯一）
- `PATCH /api/admin/templates/:id/active`
  - 入参：`{ isActive }`
- `DELETE /api/admin/templates/:id`

## 四、社区管理（可选扩展，但建议同期开工）

### 7. 社区帖子审核

- `GET /api/admin/community/posts`
  - 查询参数：`status, reviewStatus, keyword, page, limit`
- `GET /api/admin/community/posts/:id`
- `PATCH /api/admin/community/posts/:id/review`
  - 入参：`{ reviewStatus: approved|rejected, reason }`
- `PATCH /api/admin/community/posts/:id/visibility`
  - 入参：`{ status: hidden|published }`

### 8. 举报工单

- `GET /api/admin/community/reports`
  - 查询参数：`status, page, limit`
- `PATCH /api/admin/community/reports/:id`
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
