# TraceCraft 开发进度同步说明书

**版本**：V1.1  
**适用范围**：TraceCraft 单仓项目（backend + frontend + docs）  
**更新时间**：2026-06-09  

## 1. 目的

把“计划—执行—验收—发布”连接成固定节奏，避免需求漂移。  
目标是：每一项功能都可追溯到“状态、责任、验收证据、下次动作”。

## 2. 工件与版本边界

- **计划主文档**：`docs/TraceCraft-Project-Plan.md`
- **进度同步说明书**：`docs/Progress-Sync-Guide.md`（本文件）
- **API 约定**：`backend/src/index.js`、`backend/src/services/*`
- **前端交互说明**：`frontend/public/index.html`（MVP 预览）与 `frontend/App.js`（RN 入口）
- **发布包**：`README.md`、`.github/workflows/ci.yml`

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
- `.env`、`node_modules`、运行态文件（如 `backend/data/state.json`）必须被 `.gitignore` 排除
- 提交前必须自检 `git diff` 确认无误后再提交

## 8. 推进机制与签名

每周二、周五进行一次固定同步；必要时随时补充紧急同步。  
关键变更（数据库/地图 Key 接入/API 契约）必须附“变更说明+回滚方式”。

## 9. 里程碑交付清单（示例）

- [ ] MVP 闭环 demo 在本地稳定运行（后端 + 前端）
- [ ] `maps/config` 可读 provider 特性
- [ ] 路线缩放与重映射接口都有对应日志
- [ ] 完成一次弱网手工演练并记录结果
- [ ] App 商店前置文案初稿（定位/隐私）

## 10. 下次会议前准备（固定）

1. 更新本说明书里的“本周进展”模块  
2. 上传最新提交 hash 与测试命令输出  
3. 标注下周高优先级两项  
4. 列出阻塞项及处理建议

## 11. 最新进度表（2026-06-09）

### 本次同步目标

1. 新增后台管理模块（admin/）——用户管理、内容管理、模板管理（Mock 模式）
2. 新增数据库设计文档（db/）——PostgreSQL 建表、API 设计、维护清单
3. 后端扩展：引入 `pg` 依赖，`storage.js` 增加 PostgreSQL 存储层
4. 前端组件重构：拆分大文件为按功能域划分的独立组件
5. 新增公共组件 `BottomNavBar`，提取共享导航逻辑
6. 新增 ESLint 代码规范配置（`.eslintrc.cjs` + `.eslintignore`）
7. 补充 `.gitignore` 忽略规则（`.codex/`）
8. 更新 README 与进度文档

### 本次交付结果

| 模块 | 事项 | 状态 | 备注 |
| --- | --- | --- | --- |
| 后台管理 | 新增 `admin/` 模块：用户/内容/模板管理 Demo（localStorage mock） | 已完成 | 包含 `admin.js`(855行)、`index.html`、`styles.css`、`README.md` |
| 数据库设计 | 新增 `db/` 目录：`admin-schema.sql`（PostgreSQL 建表+索引+角色回填）、`admin-api-design.md`（API 清单）、`maintenance_checklist.md`（维护单） | 已完成 | 最小可行后台，不破坏现有跑步链路表 |
| 后端扩展 | `backend/package.json` 新增 `pg` 依赖和 `eslint` devDependency |\ 已完成 | 为后续数据库接入做准备 |
| 后端逻辑 | `index.js`、`routeService.js`、`storage.js` 大幅扩展（+1886 行） | 已完成 | 增加管理接口路由、PostgreSQL 存储适配、扩展服务逻辑 |
| 前端重构 | 拆分 `Screens14to18/19to22/23to26.tsx` 为按功能域划分的新文件 | 已完成 | `TraceJourneyScreens.tsx`(894行)、`DiscoveryScreens.tsx`(691行)、`CommunityScreens.tsx`(879行) |
| 公共组件 | 新增 `components/common/BottomNavBar.tsx` | 已完成 | 提取底部导航栏为可复用组件 |
| 代码规范 | 新增 `.eslintrc.cjs` + `.eslintignore` | 已完成 | 支持 JS/TS/TSX，分别配置 backend 和 frontend 规则 |
| 开发工具 | 新增 `.codex/` 目录（Agent 配置） | 已完成 | 已加入 .gitignore |
| 文档 | 更新 README.md 项目结构（新增 admin/、db/）、更新进度说明书 | 已完成 | |

### 未完成/待处理

| 模块 | 待办 | 目标日期 | 风险 |
| --- | --- | --- | --- |
| 后台管理 | admin mock service 迁移为后端 API（用户/内容/模板管理接口） | 2026-06-15 | 中 |
| 数据库 | 执行 `admin-schema.sql` 建表并验证索引 | 2026-06-12 | 低 |
| 测试 | 补充本地交互冒烟（关键按钮：开始/暂停/继续/分享/返回） | 2026-06-12 | 中 |
| 样式 | 严格匹配设计稿，追加字体系统与字号规范化 | 2026-06-15 | 低 |
| 运维 | ESLint 规则全量通过验证（`npm run lint`） | 2026-06-11 | 低 |

### 版本与里程碑映射
- 关键改动提交：后台管理模块、数据库设计文档、PostgreSQL 存储层、前端组件拆分、ESLint 配置
- 下次同步建议：当 admin API 落地或数据库 schema 变更时，需同步更新 `db/` 文档和本说明书

## 2026-06-09：全量运行现状同步

- 当前状态：后台管理页与 App 展示页均为 mock data 驱动，未走“落库/持久化生产链路”。
- 后台管理确认：
  - 文件 `admin/admin.js` 使用 `DEFAULT_DB` 与 `service.list/create/update/remove` 的本地 mock 数据层。
  - 状态持久化只落到 `localStorage["tracecraft-admin-mock-db-v2"]`，不是数据库或后端 API。
  - 启动页与列表/编辑都通过该 mock service 返回数据。
- App 页面确认：
  - 文件 `frontend/public/tracecraft.js` 的种子、草稿、会话摘要都基于 `localStorage`（`tc_nav_seed` 等）进行读写。
  - 页面切换与参数拼接为运行时 seed/query 的本地拼装逻辑，不依赖后端分页/查询接口。
  - `frontend/src/App.tsx` 只把 onboarding/login 状态写入 `localStorage`，用于体验状态保持。
  - `frontend/src/i18n.ts` 仍有 `/v1/maps/config` 的可选远端回退，但失败时会使用本地默认文案，不阻断前端展示。
- 兼容说明：仓库内存在 `frontend/App.js` 旧路径示例，当前实现中 `userId: 'demo'` 与 `fakeImage` 仍属于演示行为（非真实持久化）。
- 下一步动作（已冻结为阶段性计划）：
  - P1：Admin mock service 迁移为后端 API（用户、内容、模板三类管理接口），保留 `service` 方法签名做最小侵入替换。
  - P2：App 展示页改造为服务端会话与记录管理链路（历史/完成态/模板/运行状态）后再退回 `localStorage` 作为短期缓存。
  - P3：后端技术架构按接口化/服务化重构（鉴权、持久层、离线兜底、可观测性）逐层上线，替代当前硬编码/浏览器本地依赖。
