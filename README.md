# TraceCraft

TraceCraft 是一款**图片/形状转跑步路径并可实时导航的城市创意运动 App**：用户上传任意图片（涂鸦、Logo、表情包等）或选择基础图形模板，系统生成可预览、可调整、可确认风险的跑步路线，并在 App 内直接导航，不出现 GPX 文件概念。

当前仓库包含后端 API（Node.js/Express）、移动端 Web 应用（Vite + React + TypeScript + TailwindCSS）与独立管理后台（Vite + React + TypeScript + Ant Design）。

## 项目结构

```text
TraceCraft/
├── backend/                  # Node.js API 服务（Express）
│   ├── src/
│   │   ├── index.ts          # 路由与入口
│   │   ├── services/         # 路线生成、持久化（含 PostgreSQL 适配）
│   │   └── utils/            # 坐标转换、地理工具
│   └── .env.example          # 环境变量模板
├── frontend/                 # Web 应用（Vite + React + TS + TailwindCSS）
│   ├── src/
│   │   ├── App.tsx           # 主组件与屏幕路由
│   │   ├── main.tsx          # 入口
│   │   ├── types.ts          # 类型定义
│   │   ├── data.ts           # 预设数据
│   │   ├── i18n.ts           # 国际化模块
│   │   ├── index.css         # 全局样式（TailwindCSS）
│   │   └── components/       # UI 组件（按功能域拆分）
│   ├── public/               # 静态 HTML 页面（原型参考）
│   ├── vite.config.ts
│   └── tsconfig.json
├── admin/                    # 独立管理后台（Vite + React + TS + Ant Design，读写 PostgreSQL）
├── db/                       # 数据库设计文档（PostgreSQL schema、API 设计）
└── docs/                     # 项目文档、UI 设计稿
```

## 快速启动

### 1. 启动后端

```bash
cd backend
cp .env.example .env       # 首次运行先复制（Windows: copy .env.example .env）
npm install
npm run dev
```

服务地址：`http://localhost:3001`

- 健康检查：`GET /health`
- 地图配置：`GET /v1/maps/config`

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

服务地址：`http://localhost:3000`

> 后端和前端需**同时启动**，前端通过 API 与后端通信。

### 3. 启动管理后台

```bash
cd admin
npm install
npm run dev
```

后台地址：`http://localhost:3002`

默认 API：`http://localhost:3001/api`

本地管理后台登录：

- 用户名：`admin`
- 旧种子账号本地登录需同时配置 `TRACECRAFT_ALLOW_ADMIN_PASSWORD_FALLBACK=1` 和 `TRACECRAFT_ADMIN_PASSWORD`

> 管理后台依赖后端和 PostgreSQL；数据库需已有 `admin-root/admin` 种子用户。

## 核心使用流程

1. 打开应用 → 引导页 / 登录
2. 选择路线来源：基础图形模板 或 自定义图片
3. 设置目标里程（如 3km / 5km）并读取当前位置
4. 后端生成路线点 → 返回 `routeId`、`points`、路线元数据和风险信息
5. 路线预览 → 检查起点适配、GPS 精度、距离偏差、可跑性风险和图形相似度
6. 用户确认 / 调整起点 / 重新生成
7. 开始导航 → 实时定位上报 → 偏离提示
8. 完成跑步 → 闭环报告

## 模板与自定义图片

- **基础模板**：圆形、三角形、星形、爱心等模板只代表“理想形状”，进入导航前仍需要生成真实路线点并经过预览确认。
- **自定义图片**：用户选择 JPG/PNG 后上传到后端，由后端识别轮廓并生成路线点，前端负责展示预览、风险提示和调整入口。
- **统一确认页**：模板和图片最终都进入同一个“路线预览 + 风险提示 + 用户确认”步骤，确认通过后才允许开始导航。
- **风险分级**：低风险只提示；中风险弹窗确认；高风险阻断导航，只允许调整起点或重新生成。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 6 + TailwindCSS 4 + Motion |
| 管理后台 | React 19 + TypeScript + Vite 6 + Ant Design 5 |
| 后端 | Node.js + Express |
| 数据库 | PostgreSQL（唯一持久化存储，不再使用 state.json / 内存文件兜底） |
| 地图 | 高德（国内）/ Google Maps（国际），预留百度、腾讯 |
| 国际化 | 内置 i18n（中/英双语）|
| 质量检查 | TypeScript typecheck + Vite/tsc build |

## API 接口（V1）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/maps/config` | 获取地图 provider 配置 |
| `POST` | `/api/auth/quick-login` | 微信/支付宝快捷注册登录（仅 `TRACECRAFT_ALLOW_DEV_AUTH=1` 时可用） |
| `POST` | `/api/auth/phone-login` | 手机号快捷登录（仅开发开关开启，并使用 `TRACECRAFT_DEV_SMS_CODE`） |
| `GET` | `/api/me` | 获取当前用户资料、绑定来源、统计和设置 |
| `PUT` | `/api/me/settings` | 保存当前用户设置到 `users.metadata.settings` |
| `POST` | `/api/routes/from-template` | 基础模板生成路线点并返回风险信息 |
| `POST` | `/api/routes` | 上传图片生成路线点并返回风险信息 |
| `GET` | `/api/routes/{routeId}` | 获取单条路线详情 |
| `PUT` | `/api/routes/{routeId}/adjust` | 按目标里程缩放路线 |
| `PUT` | `/api/routes/{routeId}/rebase` | 重设起点/终点 |
| `POST` | `/api/routes/{routeId}/start` | 开始导航会话；中风险需 `riskConfirmed=true`，高风险阻断 |
| `POST` | `/api/sessions/{sessionId}/location` | 上报实时位置 |
| `GET` | `/api/sessions/{sessionId}` | 查询导航状态 |
| `POST` | `/api/sessions/{sessionId}/finish` | 结束跑步 |
| `GET` | `/api/runs` | 获取当前用户路线/轨迹列表 |
| `GET` | `/api/run-history` | 获取当前用户跑步历史 |
| `GET` | `/api/templates` | 获取模板库列表 |
| `GET` | `/api/templates/{templateId}` | 获取模板详情 |
| `GET` | `/api/favorites` | 获取当前用户收藏 |
| `POST` | `/api/favorites` | 收藏模板/路线等目标 |
| `DELETE` | `/api/favorites/{targetType}/{targetId}` | 取消收藏 |
| `GET` | `/api/search/hints` | 获取搜索历史、热门词、分类 |
| `GET` | `/api/search` | 搜索模板、我的轨迹、用户 |
| `GET` | `/api/community/posts` | 获取社区广场列表 |
| `POST` | `/api/community/posts` | 发布社区轨迹作品 |
| `GET` | `/api/community/posts/{postId}` | 获取帖子详情和评论 |
| `POST` | `/api/community/posts/{postId}/comments` | 发布评论 |
| `POST` | `/api/community/posts/{postId}/like` | 点赞/取消点赞 |
| `POST` | `/api/community/follows/{userId}` | 关注/取消关注 |
| `GET` | `/api/notifications` | 获取消息通知 |
| `POST` | `/api/notifications/read` | 标记消息已读 |
| `POST` | `/api/admin/auth/login` | 管理后台登录，写入 HttpOnly Cookie |
| `GET` | `/api/admin/auth/me` | 获取当前管理员信息 |
| `GET` | `/api/admin/{module}` | 后台用户、内容、模板列表，支持分页/筛选 |
| `POST/PUT/DELETE` | `/api/admin/{module}` | 后台用户、内容、模板写操作 |

## 数据库现状

- 已接入 VM PostgreSQL：`192.168.252.128:5432/tracecraft`
- 当前核心表：`users`、`auth_identities`、`routes`、`route_versions`、`run_sessions`、`run_location_events`、`run_audit_logs`
- 已落库功能：快捷注册登录、路线生成/查询、导航会话、位置上报、完成记录、我的轨迹、跑步历史、个人中心统计、用户设置、模板库、收藏、搜索、社区发布/广场/评论/点赞/关注/通知、后台管理 CRUD
- 已执行并维护为完整 schema 的 SQL：`db/feature-precreate-schema.sql`
- Schema 覆盖：核心用户/路线/会话、快捷登录身份、后台管理、模板库、收藏、搜索、社区、评论、点赞、关注、通知、分享记录、用户素材、反馈

> `db/feature-precreate-schema.sql` 已在 VM PostgreSQL 执行；后续如调整表结构仍需先确认目标环境和影响范围。

## 安全与边界说明

- **API Key**：不在前端明文保存，统一在后端 `.env` 中配置；`/api/maps/config` 仅返回密钥是否已配置的状态，不暴露密钥内容。
- **鉴权**：用户端与管理端 token 均为服务端 HMAC 签名 token，并通过 HttpOnly Cookie 作为主登录态；用户接口不再接受 `x-user-id`、body/query `userId` 等身份回退。
- **开发登录**：快捷登录和测试短信码必须显式配置 `TRACECRAFT_ALLOW_DEV_AUTH=1`；正式环境不要开启。
- **CORS**：默认只允许 `http://localhost:3000`、`http://localhost:3002`，可通过 `TRACECRAFT_CORS_ORIGINS` 配置。
- **坐标体系**：服务端内部统一 WGS84，按 provider 输出对应坐标参考系（高德用 GCJ-02、百度用 BD-09 等）。
- **路线风险**：开始导航前必须经过路线预览确认；V1 后端优先用高德 Web 服务步行规划做片段抽样，并结合 GPS 精度、起点距离、距离偏差做风险分级。无法验证道路可跑性时默认高风险阻断，可在本地用 `TRACECRAFT_ALLOW_UNVERIFIED_ROUTES=1` 临时放开。
- **敏感信息**：`.env`、日志文件和密钥文件会被 `.gitignore` 排除；`package-lock.json` 应保留用于可复现安装。

## 后台管理（admin/）

`admin/` 目录包含独立 Vite React 管理后台，使用 Ant Design 构建运营工作台，当前通过后端 API 读写 PostgreSQL：

- **用户管理**：管理员列表、角色绑定、状态切换
- **内容管理**：内容发布与审核
- **模板管理**：模板分类、版本历史

打开方式：

```bash
cd admin
npm install
npm run dev
# 访问 http://localhost:3002
```

说明：后台接口主链路使用 HttpOnly Cookie 登录态；服务端仍兼容 `Authorization: Bearer <admin_token>`。管理端已有基础角色权限拦截，删除操作采用软处理（用户禁用、内容归档、模板停用）。后续仍可补会话刷新和更细粒度权限矩阵。

## 数据库设计（db/）

`db/` 目录包含数据库相关文档：

- `feature-precreate-schema.sql` — MVP 完整 PostgreSQL schema（核心链路 + 后续页面表 + 种子数据）
- `README.md` — 数据库执行状态、后台 API、上线前检查、修复 SQL、回滚建议

## 下一步计划

1. 接入真实微信/支付宝授权 SDK，替换当前仅显式开发开关可用的快捷登录
2. 头像、分享图、路线封面接本地文件服务或 OSS
3. 后台管理补真实密码哈希、会话刷新和权限矩阵
4. 社区审核流接后台管理界面
5. AI 边缘识别升级（图片去噪 → 向量化曲线提取）
6. 添加上架前权限文案与隐私政策
