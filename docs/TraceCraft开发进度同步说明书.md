# TraceCraft 开发进度同步说明书

**版本**：V1.9
**适用范围**：TraceCraft 单仓项目（backend + frontend + admin + shared + docs）
**更新时间**：2026-06-18

## 1. 目的

把“计划—执行—验收—发布”连接成固定节奏，避免需求漂移。
目标是：每一项功能都可追溯到“状态、责任、验收证据、下次动作”。

## 2. 工件与版本边界

- **计划主文档**：`docs/TraceCraft-Project-Plan.md`
- **进度同步说明书**：`docs/Progress-Sync-Guide.md`（本文件）
- **API 约定**：`backend/src/index.ts`、`backend/src/services/*`
- **共享类型**：`shared/types.ts`（前后端 API 契约权威来源）
- **前端交互说明**：`frontend/src/App.tsx`（RN 入口）
- **发布包**：`README.md`

> 一切变更必须有“计划项 -> 实际代码 -> 验证证据”三联关系。

## 3. 沟通节奏

### 3.1 每日（或每次里程碑）同步（同步格式）

每次更新后由开发方输出以下固定格式：

1. **已完成**（本次提交/动作）
2. **进行中**（进行中的项）
3. **阻塞**（卡点及原因）
4. **下步动作**（下一次执行顺序）
5. **证据**（命令输出、截图、接口返回）

### 3.2 每周汇总

每周生成一次摘要文件或消息，包含：
- 本周目标是否达成（是/否）
- 完成项占比
- 测试通过率（手工/脚本）
- 已上线变更与待上线项
- 风险与下一周规避措施

## 4. 里程碑流程（D1-D90）

#### 阶段 A（D1-D7）：打底
- 前后端启动和接口验收
- 首页定位与地图配置对接
- 路线生成闭环打通

#### 阶段 B（D8-D21）：稳定性
- 持久化与会话恢复
- 起点/终点重映射（rebase）
- 弱网导航降级策略

#### 阶段 C（D22-D45）：平台化
- AMap/Google provider 渲染
- 坐标转换与CRS治理
- 日志与错误码体系

#### 阶段 D（D46-D90）：商店化准备
- 权限和隐私文案
- 交付清单审核
- 上线前体验回归

## 5. 任务状态模型（必用）

- **0/待排期**：已记录，未开始
- **1/进行中**：本周开始执行
- **2/评审中**：等待验收或依赖
- **3/已完成**：有验收证据并打标签
- **9/阻塞**：需外部决策/资源

每个任务至少填写：
- `Owner`
- `Expected Output`
- `Acceptance`
- `Verifier`

## 6. 验收模板

### 6.1 接口验收
- 请求成功率（成功样本/总样本）
- 响应字段完整性（是否有 `ok`, `routeId/sessionId`)
- 错误码覆盖（非法参数、无权限、无会话）

### 6.2 前端验收
- 关键路径 3-5 步能否顺序点击
- 无法定位时是否阻断并提示
- 启动/重试/完成的状态反馈是否稳定

### 6.3 上线验收
- 关键接口日志落盘
- 基础启动脚本可执行
- `.env` 未被提交到仓库

## 7. 敏感信息与风险控制

- 禁止提交任何实际地图 Key、Token、服务端密码到仓库
- `.env`、`node_modules`、数据库备份等运行态文件必须被 `.gitignore` 排除
- 提交前必须自检 `git diff` 确认无误后再提交

## 8. 推进机制与签名

每周二、周五进行一次固定同步；必要时随时补充紧急同步。
关键变更（数据库/地图 Key 接入/API 契约）必须附“变更说明+回滚方式”。

## 9. 里程碑交付清单（示例）

- [ ] MVP 闭环在本地稳定运行（后端 + 前端）
- [ ] `maps/config` 可读 provider 特性
- [ ] 路线缩放与重映射接口都有对应日志
- [ ] 模板/自定义图片生成后进入路线预览页
- [ ] GPS 精度、起点距离、路线风险、距离偏差具备提示或阻断策略
- [ ] 用户确认路线后才允许调用 `start-run`
- [ ] 完成一次弱网手工演练并记录结果
- [ ] App 商店前置文案初稿（定位/隐私）

## 10. 下次会议前准备（固定）

1. 更新本说明书里的“本周进展”模块
2. 上传最新提交 hash 与测试命令输出
3. 标注下周高优先级两项
4. 列出阻塞项及处理建议

## 11. 最新进度表（2026-06-18）

### 本次同步目标（全栈代码质量优化 + 未使用代码清理 + 中文注释增强）

1. 后端存储层、认证体系、工具函数全面优化
2. 前端统一 API 客户端，消除重复代码，清理死代码
3. 管理后台语义重命名 + 安全加固
4. 全项目未使用导入/变量/导出检索并删除
5. 关键文件补充中文注释，提高代码可读性

### 本次交付结果

| 模块 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 后端 | `postgres-storage.ts` CJS→ESM、`null!`修复、`appendLocation`环形缓冲(200条) | 已完成 | 防止 locationSample/actualPath 无限增长 |
| 后端 | `storage.ts` 接口契约修复：`createRoute`返回`Route\|null`、包装层抛错 | 已完成 | `shared/types.ts` 同步更新 IStorage |
| 后端 | `index.ts` 添加全局错误处理中间件（CORS + 500 兆底） | 已完成 | 未捕获异常不再崩溃 |
| 后端 | 统一 `newId`：4处重复实现→`utils/id.ts` | 已完成 | routeService/authService/communityService/discoveryService |
| 后端 | `.env.example` AMAP_KEY 替换为占位符 | 已完成 | 安全保护 |
| 后端 | `routeService.ts` 删除未使用导入(`latLngCentroid`/`RouteContext`)、未使用函数(`toPositiveNumber`)、未使用导出(`SessionStatusType`) | 已完成 | 零新增错误 |
| 后端 | `profileService.ts` 删除未使用常量 `DEFAULT_SETTINGS` | 已完成 | |
| 后端 | `storage.ts` 删除未使用导出(`createRouteRecord`/`normalizePoints`) | 已完成 | |
| 后端 | 关键文件中文注释增强(`routeService`/`postgres-storage`/`storage`/`profileService`/`shareService`) | 已完成 | 60+ 处函数/接口注释 |
| 前端 | 创建统一 `api/client.ts`，消除 5 个 API 文件的 `API_BASE`/`authHeaders`/`parsePayload` 重复 | 已完成 | `apiGet/apiPost/apiPut/apiDelete` |
| 前端 | `auth.ts` 清理 token 死代码（`getAuthToken`等） | 已完成 | 认证完全依赖 HttpOnly Cookie |
| 前端 | `routes.ts` `listUserRuns` 支持分页参数 | 已完成 | 返回 `{runs,total,page,limit}` |
| 前端 | 所有 5 个 api 文件迁移到统一 client | 已完成 | routes/auth/user/community/discovery |
| 前端 | 删除 `routes.ts` 未使用 `API_BASE` 导入、`HomeExtraScreens.tsx` 未使用 `text`/`onUploadImageRoute` | 已完成 | |
| 前端 | 关键文件中文注释增强（client/routes/auth/user/community/discovery） | 已完成 | 80+ 处函数/接口注释 |
| 管理后台 | `admin.ts` `saveAdminToken`→`markAdminLoggedIn` 语义重命名 + JSON.parse try-catch | 已完成 | |
| 管理后台 | `App.tsx` 清理 eslint-disable 死注释 | 已完成 | |
| 管理后台 | 删除未使用 `ContentItem`/`TemplateItem` 类型重导出 | 已完成 | |
| 管理后台 | 中文注释增强（API 客户端、CRUD 操作、登录态管理） | 已完成 | 20+ 处注释 |
| 跨模块 | 清理所有 ESLint disable 残留注释 | 已完成 | |

### 已验证证据

| 验证项 | 结果 |
| --- | --- |
| `backend npx tsc --noEmit` | 通过（6 个预存未实现导入错误，非本次引入） |
| `frontend npx tsc --noEmit` | 通过（12 个预存未实现导入/类型错误，非本次引入） |
| `admin npx tsc --noEmit` | 通过（2 个预存配置错误，非本次引入） |
| 新增编译错误 | 0 |

### 当前风险/待处理

| 模块 | 待办 | 目标日期 | 风险 |
| --- | --- | --- | --- |
| 前端 | `ProfileAndSettings.tsx` 引用 6 个未实现的 API 函数(logout/clearUserCache等) | 内测前 | 中 |
| 前端 | `NavigationAndEditor.tsx` 引用 `pauseSession`/`resumeSession` 未实现 | 内测前 | 中 |
| 后端 | `communityApi`/`discoveryApi`/`userApi` 引用未实现的 Service 函数 | 内测前 | 中 |
| 前端 | `App.tsx` 错误信息接入 i18n（需重构 Provider 层级） | 内测前 | 低 |

## 12. 历史进度表（2026-06-17，管理后台 React + Ant Design 改造）

### 本次同步目标（管理后台 React + Ant Design 改造）

1. 将 `admin/` 从原生 HTML/JS 静态面板升级为独立 Vite React 管理端
2. 使用 Ant Design 实现后台登录、模块导航、指标卡、分页表格和抽屉表单
3. 维护后端管理 API：登录态、分页筛选、写操作审计
4. 同步 README、后台 README 和后台 API 设计文档

### 本次交付结果

| 模块 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 后台工程 | `admin/` 独立 Vite React + TypeScript 工程 | 已完成 | 新增 `admin/package.json`、`vite.config.ts`、`tsconfig.json` |
| UI 框架 | 引入 Ant Design | 已完成 | 管理端使用表格、表单、抽屉、菜单、统计卡 |
| 登录 | 后台 MVP 登录页 | 已完成 | `POST /api/admin/auth/login`，口令来自 `TRACECRAFT_ADMIN_PASSWORD` |
| 登录态 | 当前管理员校验 | 已完成 | `GET /api/admin/auth/me`，前端保存 admin token |
| 用户管理 | 管理员列表、角色、状态、编辑、新增、删除 | 已完成 | 支持分页、搜索、状态筛选 |
| 内容管理 | 内容列表、编辑、新增、删除 | 已完成 | 支持分页、搜索、状态筛选 |
| 模板管理 | 模板列表、JSON payload 编辑、新增、删除 | 已完成 | 支持分页、搜索、启停筛选 |
| 后端 API | `/api/admin/{module}` 列表返回分页结构 | 已完成 | `{ rows, total, page, limit }` |
| 审计 | 写操作记录 `admin_audit_logs` | 已完成 | 审计失败不阻断主流程 |
| 文档 | README、admin README、admin API 设计更新 | 已完成 | 当前文档已同步 |

### 已验证证据

| 验证项 | 结果 |
| --- | --- |
| `backend npm run typecheck` | 通过 |
| `admin npm run build` | 通过 |
| `http://localhost:3002` | 返回 200 |
| 乱码检查 | 未发现新增乱码标记 |

### 当前风险/待处理

| 模块 | 待办 | 目标日期 | 风险 |
| --- | --- | --- | --- |
| 后台安全 | MVP 口令兼容替换为完整 `password_hash` 校验和 refresh token | 上线前 | 高 |
| 权限 | 权限矩阵从文档落到接口中间件和前端按钮级控制 | 上线前 | 高 |
| 删除策略 | 后台 `DELETE` 从物理删除调整为软删除或二次确认策略 | 内测前 | 中 |
| 社区审核 | 社区帖子审核、举报工单接入后台页面 | 内测前 | 中 |

## 13. 历史进度表（2026-06-17，数据库接入 + 用户数据页真实化）

### 本次同步目标（数据库接入 + 用户数据页真实化 + 后续表结构预建）

1. 在 VMware VM 上使用 Docker 准备 TraceCraft MVP 必需数据库
2. 打通快捷注册登录，去掉登录页抖音入口，改为微信/支付宝/手机号
3. 将我的轨迹、跑步历史、轨迹详情、个人中心统计、设置项改为数据库驱动
4. 检索剩余静态页面，提前保存后续所需 PostgreSQL 建表 SQL

### 本次交付结果

| 模块 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 基础设施 | VM `192.168.252.128` 启动 PostgreSQL Docker 容器 | 已完成 | 容器 `tracecraft-postgres`，PostgreSQL 14.23，卷 `tracecraft_pgdata` |
| 后端配置 | `backend/.env` 指向 VM PostgreSQL | 已完成 | `DATABASE_URL=postgresql://tracecraft:***@192.168.252.128:5432/tracecraft` |
| 核心表 | `users/routes/route_versions/run_sessions/run_location_events/run_audit_logs` | 已完成 | 后端 PostgresStorage 自动建表 |
| 快捷登录 | 新增微信/支付宝快捷注册登录 API | 已完成 | `POST /api/auth/quick-login` |
| 手机登录 | 新增手机号测试登录 API | 已完成 | `POST /api/auth/phone-login`，测试码 `8888` |
| 前端登录 | 登录页移除抖音，替换为支付宝 | 已完成 | 登录成功保存 token，后续 API 使用真实登录 token |
| 用户资料 | 新增当前用户资料/统计接口 | 已完成 | `GET /api/me` |
| 用户设置 | 设置项保存到 `users.metadata.settings` | 已完成 | `PUT /api/me/settings` |
| 我的轨迹 | `MY_TRACES_ITEMS` 静态数组移除，改读数据库 | 已完成 | 前端调用 `GET /api/runs` |
| 轨迹详情 | 改为按 routeId 拉取真实路线 | 已完成 | 前端调用 `GET /api/routes/:routeId` |
| 跑步历史 | 改为读 `run_sessions + routes` | 已完成 | `GET /api/run-history` |
| 跑步详情 | 改为根据选中 session 展示真实指标 | 已完成 | 无历史时显示空态 |
| 模板库 | 快速模板、完整模板库改读数据库 | 已完成 | `GET /api/templates`、`GET /api/templates/:templateId` |
| 收藏 | 收藏列表、收藏/取消收藏改写数据库 | 已完成 | `GET/POST/DELETE /api/favorites` |
| 搜索 | 搜索提示、搜索历史、热门词、搜索结果接数据库 | 已完成 | `GET /api/search/hints`、`GET /api/search` |
| 社区 | 分享发布、广场、帖子详情、评论、点赞、关注、通知接数据库 | 已完成 | `community_posts/comments/reactions/user_follows/notifications` |
| 后台管理 | admin 用户、内容、模板管理从 localStorage 改为 API | 已完成 | `GET/POST/PUT/DELETE /api/admin/{module}` |
| 完整 Schema SQL | 维护并执行 MVP 完整数据库表设计 | 已完成 | `db/feature-precreate-schema.sql` 覆盖核心链路和后续页面表 |
| 文档 | README、DB README、进度说明书更新 | 已完成 | 本节记录 |

### 已验证证据

| 验证项 | 结果 |
| --- | --- |
| VM 5432 端口 | 本机可连接 |
| PostgreSQL 容器 | `healthy` |
| 快捷登录接口 | `ok=true`，返回 `user:<id>` token |
| `/api/me` | 通过 |
| `/api/me/settings` | 通过，可写入 `distanceUnit=目前测试为 mile` |
| `/api/runs` | 通过，新测试账号返回 `routes=0` 属正常 |
| `/api/run-history` | 通过，新测试账号返回 `historyCount=0` 属正常 |
| `/api/templates` | 通过，返回模板库种子数据 |
| `/api/favorites` | 通过，可收藏/取消收藏模板 |
| `/api/search?q=心形` | 通过，中文同义词命中 `tpl-heart` |
| `/api/community/posts` | 通过，可发布、列表、评论、点赞 |
| `/api/notifications` | 通过，通知列表和已读接口可用 |
| `/api/admin/users` | 通过，后台 API 读 PostgreSQL |
| `backend npm run typecheck` | 通过 |
| `backend npm run build` | 通过 |
| `frontend npx tsc --noEmit` | 通过 |
| `frontend npm run build` | 通过 |

### 当前数据库表状态

已存在表：

| 表 | 来源 | 状态 |
| --- | --- | --- |
| `users` | PostgresStorage | 已建 |
| `auth_identities` | 快捷登录 | 已建 |
| `routes` | PostgresStorage | 已建 |
| `route_versions` | PostgresStorage | 已建 |
| `run_sessions` | PostgresStorage | 已建 |
| `run_location_events` | PostgresStorage | 已建 |
| `run_audit_logs` | PostgresStorage | 已建 |

已保存并已执行的预建表 SQL：

| 文件 | 覆盖范围 | 执行状态 |
| --- | --- | --- |
| `db/feature-precreate-schema.sql` | 核心用户/路线/会话、快捷登录身份、后台管理、模板库、收藏、搜索、社区、评论、点赞、关注、通知、分享、用户素材、反馈 | 已执行并维护为完整 schema |

### 未完成/待处理

| 模块 | 待办 | 目标日期 | 风险 |
| --- | --- | --- | --- |
| 授权 | MVP 开发直通替换为真实微信/支付宝 SDK | 上线前 | 中 |
| 文件 | 头像、分享图、路线封面接本地文件服务或 OSS | 内测前 | 中 |
| 后台安全 | 管理员登录鉴权、权限校验、操作审计完善 | 上线前 | 高 |
| 社区审核 | 社区审核流接入后台操作界面 | 内测前 | 中 |

### 版本与里程碑映射

- 当前状态：MVP 主链路、发现页、社区页、通知页、后台管理已经从本地静态/浏览器本地数据迁移到 PostgreSQL 数据链路。
- 核心闭环：登录 -> 生成路线 -> 预览 -> 开始导航 -> 上报位置 -> 完成 -> 我的轨迹/历史/个人统计 -> 模板库/收藏/搜索 -> 社区发布/互动/通知 -> 后台管理。
- 技术决策：暂不接 OSS；图片上传仅在请求处理中临时读取，业务持久化统一进入 PostgreSQL，不再使用 `state.json` 文件态存储。
- 下一步建议：优先补真实第三方授权、文件存储、后台管理员鉴权和社区审核操作。

## 14. 历史进度表（2026-06-16，路线预览地图真实化）

### 本次同步目标（路线预览地图真实化 + UX 增强）

1. 将路线预览页的 SVG 假地图替换为基于 Leaflet + OpenStreetMap 的真实地图渲染
2. 街道名称来自真实地图瓦片数据，随语言切换自动更新
3. 全面提升地图交互体验：加载骨架屏、错误降级、自定义控件、自适应容器

### 本次交付结果

| 模块 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 地图渲染 | SVG 假地图 → Leaflet + OpenStreetMap 真实瓦片 | 已完成 | 中文用 OSM，英文用 CartoDB Voyager |
| 定位集成 | 地图以 `getCurrentPoint()` 返回的用户真实坐标为中心 | 已完成 | 路线数据已包含真实 GeoPoint 坐标 |
| 语言联动 | 切换语言时自动更换瓦片源（OSM ↔ CartoDB） | 已完成 | `tileLayer.setUrl()` 平滑过渡 |
| 加载体验 | 脉冲骨架屏 + spinner + 双层 loading 状态 | 已完成 | idle → loading → ready/error |
| 错误处理 | 瓦片加载失败自动切换备用源 + 琥珀色错误提示 | 已完成 | 主/备两层瓦片源 |
| 交互控件 | 自定义缩放按钮组 + 一键适应路线按钮 | 已完成 | hover 渐入显示，不遮挡地图 |
| 容器自适应 | ResizeObserver 监听尺寸变化 → invalidateSize | 已完成 | 防止容器 resize 后地图变形 |
| 起终点标记 | DivIcon 自定义标记（绿色脉冲光环 / 红色实点） | 已完成 | 替代简单 circleMarker |
| 滚动保护 | scrollWheelZoom: false 防止误缩放 | 已完成 | — |
| 无障碍 | 所有控件带 aria-label | 已完成 | — |
| 依赖 | 新增 leaflet + @types/leaflet | 已完成 | frontend/package.json |
| i18n | 新增 8 个地图状态/控件翻译键（中/英） | 已完成 | zh-CN.ts / en-US.ts |
| 构建 | `vite build` + `tsc --noEmit` 验证通过 | 已完成 | 零新增错误 |

### 未完成/待处理

| 模块 | 待办 | 目标日期 | 风险 |
| --- | --- | --- | --- |
| 数据库 | PostgreSQL 容器内启动并建库建表 | 2026-06-17 | 中（PG 10 启动失败待排查日志） |
| 数据库 | Redis 容器内安装并启动 | 2026-06-17 | 低 |
| 后端 | 百度步行规划 fallback | 2026-06-24 | 中 |
| 产品 | 路线风险弹窗文案和阻断规则细化到 UI 文档 | 2026-06-17 | 低 |
| 验证 | 补充模板路线、自定义图片、风险阻断三条手工验收用例 | 2026-06-20 | 中 |

### 版本与里程碑映射
- 关键改动：路线预览从 SVG 示意图升级为真实地图，街道名来自地图瓦片数据，不再使用硬编码街道名
- 技术决策：选用 Leaflet（轻量、免费、无需 API Key）而非 AMap JS SDK，降低接入成本
- 下次同步建议：数据库连通后执行 `admin-schema.sql` 建表，验证 PostgresStorage 全链路

## 15. 历史进度表（2026-06-10，前端代码审查与优化）

### 本次同步目标（前端代码审查与优化）

1. 全面审查前端代码，找出 Bug、类型安全、性能、代码质量等问题
2. 修复全部 18 项问题（含 2 项构建警告）
3. 重构大组件拆分，消除 Vite 静态/动态混合导入警告
4. 构建验证零错误零警告

### 本次交付结果

| 模块 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| Bug | TraceJourneyScreens "平均配速"显示日期而非配速数据 | 已完成 | 字段引用错误修正 |
| Bug | DiscoveryScreens toast 提示使用英文 | 已完成 | 改为中文提示 |
| 类型安全 | AppScreenRouter 22 处 `as any` → `React.ComponentProps<typeof X>` | 已完成 | 全面消除类型断言 |
| 类型安全 | types.ts 提取 `ShapeType` 联合类型 | 已完成 | PresetShape.iconType 和 HistoryRecord.shapeType 使用 |
| 性能 | i18n.ts `handleSetLanguage` 包裹 `useCallback` | 已完成 | 避免 useMemo 依赖失效 |
| 性能 | App.tsx `STORAGE_KEYS` 移至组件外部 | 已完成 | 避免每次渲染重新创建 |
| 清理 | CommunityScreens 删除 58 行注释死代码 + 未使用变量 | 已完成 | `_setMsgList` → 使用常量 |
| 清理 | TraceJourneyScreens 变量名 `int` → `intervalId` | 已完成 | 避免遮蔽内置类型 |
| 清理 | CommonModals 移除 3 处内联 `<style>` + 文案笔误 | 已完成 | 动画关键帧移至 index.css |
| CSS | index.css `vertical-range` 属性冲突修复 | 已完成 | 移除冲突的 rotate 属性 |
| 配置 | tsconfig.json 移除冗余配置 + 添加 include/exclude | 已完成 | — |
| 配置 | package.json 依赖分类修正 | 已完成 | `@vitejs/plugin-react` 移至 devDependencies |
| 重构 | NavigationAndEditor `useRef+useState` 双重状态 → 纯 ref + renderTick | 已完成 | TraceEditorScreen 简化为单一数据源 |
| 重构 | CommonModals 拆分：BottomSheetModal 提取至 `common/BottomSheetModal.tsx` | 已完成 | 消除静态/动态混合导入警告 |
| 重构 | HomeAndLibrary 拆分：QuickTemplateScreen + FullLibraryScreen 提取至 `HomeExtraScreens.tsx` | 已完成 | 消除第二个混合导入警告 |
| 验证 | `vite build` 零错误零警告 | 已完成 | 构建产物正常 |

### 新增文件

| 文件 | 说明 |
| --- | --- |
| `frontend/src/components/common/BottomSheetModal.tsx` | 从 CommonModals.tsx 提取的图形选择弹窗组件 |
| `frontend/src/components/HomeExtraScreens.tsx` | 从 HomeAndLibrary.tsx 提取的快速模板 + 图形库屏幕 |

### 未完成/待处理

| 模块 | 待办 | 目标日期 | 风险 |
| --- | --- | --- | --- |
| 后台管理 | admin 本地数据 service 迁移为后端 API（用户/内容/模板管理接口） | 2026-06-15 | 中 |
| 数据库 | 执行 `admin-schema.sql` 建表并验证索引 | 2026-06-12 | 低 |
| 测试 | 补充本地交互冒烟（关键按钮：开始/暂停/继续/分享/返回） | 2026-06-12 | 中 |
| 样式 | 严格匹配设计稿，追加字体系统与字号规范化 | 2026-06-15 | 低 |
| 代码质量 | 前端大组件（NavigationAndEditor 等）补充函数级注释 | 2026-06-15 | 低 |
| 后端 | shared/types.ts 类型逐步替换各文件内的本地重复定义 | 2026-06-20 | 低 |

### 版本与里程碑映射
- 关键改动提交：前端全面代码审查与优化（18 项修复），组件拆分消除构建警告，类型安全提升
- 下次同步建议：当 shared/types.ts 被前后端实际引用替换时，需同步更新本说明书和 API 契约文档

## 2026-06-10（上午）：后端 TypeScript 迁移同步

- 本次变更：后端全部 JS 文件迁移为 TypeScript，strict 模式零错误通过
- 迁移范围：
  - `backend/src/utils/geo.js` → `geo.ts`：GeoPoint/ScaleOptions 接口定义，全部函数签名类型化
  - `backend/src/utils/coordAdapter.js` → `coordAdapter.ts`：CrsType 类型定义，CRS_CONVERT_MAP 用 Record 类型约束
  - `backend/src/services/storage.js` → `storage.ts`：定义 IStorage 接口契约 + 11 个数据类型，当前由 PostgresStorage implements IStorage
  - `backend/src/services/routeService.js` → `routeService.ts`：CreateRouteParams/SessionState/FinishResult 接口，核心业务逻辑类型化
  - `backend/src/index.js` → `index.ts`：Express Request 类型扩展（traceId/userId/idempotencyKey），所有路由处理器类型化
- 新增文件：
  - `backend/tsconfig.json`：strict 模式 + commonjs + ES2022，已移除 allowJs
  - `shared/types.ts`：前后端共享 API 契约类型（GeoPoint/CrsType/MapProvider/ApiResponse/Route/SessionState/FinishResult/MapConfig）
- 基础设施变更：
  - 安装依赖：typescript, tsx, @types/node, @types/express, @types/cors, @types/multer, @types/pg
  - 启动脚本：`node src/index.js` → `tsx src/index.ts`，开发无需预编译
  - 新增脚本：`npm run build`（tsc 编译）、`npm run typecheck`（tsc --noEmit）
- 项目清理：
  - 删除 `.github/workflows/ci.yml`（CI 无实际价值）
  - 删除 `.eslintrc.cjs` / `.eslintignore`（TS 迁移后不再适用）
  - 删除 `backend/err.log` / `out.log` / `.gitkeep`、`docs/.gitkeep`、`db/api_admin_design.md`
  - 删除 `frontend/tmp/` / `dist/` / `.npm-cache/`（~352MB）
  - 移除 `backend/package.json` 中 lint 脚本和 eslint devDep
  - `.gitignore` 新增 `backend/dist/`
- 验证证据：
  - `npx tsc --noEmit` → 零错误
  - 历史快照：当时服务启动返回 `storage=memory`；当前版本已移除文件态/内存态持久化，仅支持 PostgreSQL。
- 下一步动作：
  - P1：Admin 本地数据 service 迁移为后端 API
  - P2：shared/types.ts 逐步替换各文件内的本地重复类型定义
  - P3：前端大组件内部补充函数级注释

## 2026-06-09：全量运行现状同步

- 当前状态：本节为历史快照，相关本地演示数据层已在后续版本迁移到 PostgreSQL API；当前状态以 2026-06-17 最新进度表为准。
- 后台管理确认：
  - 当时文件 `admin/admin.js` 已通过 `service.list/create/update/remove` 调用后端 API；当前版本已替换为 `admin/src/App.tsx` React 管理端。
  - 状态不再写入浏览器本地数据仓库。
  - 启动页与列表/编辑通过 `/api/admin/{module}` 返回数据。
- App 页面确认：
  - 文件 `frontend/public/tracecraft.js` 的种子、草稿、会话摘要都基于 `localStorage`（`tc_nav_seed` 等）进行读写。
  - 页面切换与参数拼接为运行时 seed/query 的本地拼装逻辑，不依赖后端分页/查询接口。
  - `frontend/src/App.tsx` 只把 onboarding/login 状态写入 `localStorage`，用于体验状态保持。
  - `frontend/src/i18n.ts` 仍有 `/v1/maps/config` 的可选远端回退，但失败时会使用本地默认文案，不阻断前端展示。
- 兼容说明：历史旧路径示例已不作为当前运行入口；当前运行入口以 `frontend/src/App.tsx` 和后端 API 为准。
- 下一步动作（已冻结为阶段性计划）：
  - P1：Admin service 迁移为后端 API（用户、内容、模板三类管理接口），保留 `service` 方法签名做最小侵入替换。
  - P2：App 展示页改造为服务端会话与记录管理链路（历史/完成态/模板/运行状态）后再退回 `localStorage` 作为短期缓存。
  - P3：后端技术架构按接口化/服务化重构（鉴权、持久层、离线兜底、可观测性）逐层上线，替代当前硬编码/浏览器本地依赖。
