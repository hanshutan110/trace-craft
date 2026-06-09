# TraceCraft

TraceCraft 是一款**图片/形状转跑步路径并可实时导航的闭环运动 App**：用户上传任意图片（涂鸦、Logo、表情包等），系统自动生成可跑的路线，并在 App 内直接导航，不出现 GPX 文件概念。

当前仓库包含后端 API（Node.js/Express）与前端应用（Vite + React + TypeScript + TailwindCSS）。

## 项目结构

```text
TraceCraft/
├── backend/                  # Node.js API 服务（Express）
│   ├── src/
│   │   ├── index.js          # 路由与入口
│   │   ├── services/         # 路线生成、持久化
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
│   │   └── components/       # UI 组件
│   ├── public/               # 静态 HTML 页面（原型参考）
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/                     # 项目文档、UI 设计稿
└── .github/workflows/        # CI
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

## 核心使用流程

1. 打开应用 → 引导页 / 登录
2. 上传图片 或 选择预设形状模板
3. 设置目标里程（如 3km / 5km）
4. 后端生成路线 → 可调整缩放 / 重设起终点
5. 开始导航 → 实时定位上报 → 偏离提示
6. 完成跑步 → 闭环报告

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 6 + TailwindCSS 4 + Motion |
| 后端 | Node.js + Express |
| 持久化 | V1 文件态（state.json）→ 后续迁移 Redis + PostgreSQL |
| 地图 | 高德（国内）/ Google Maps（国际），预留百度、腾讯 |
| 国际化 | 内置 i18n（中/英双语） |

## API 接口（V1）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/v1/maps/config` | 获取地图 provider 配置 |
| `POST` | `/v1/routes/from-image` | 上传图片生成路线 |
| `POST` | `/v1/routes/{routeId}/adjust` | 按目标里程缩放路线 |
| `POST` | `/v1/routes/{routeId}/rebase` | 重设起点/终点 |
| `POST` | `/v1/routes/{routeId}/start-run` | 开始导航会话 |
| `POST` | `/v1/run/{sessionId}/location` | 上报实时位置 |
| `GET` | `/v1/run/{sessionId}/state` | 查询导航状态 |
| `POST` | `/v1/run/{sessionId}/finish` | 结束跑步 |
| `GET` | `/v1/users/me/runs` | 获取用户跑步历史 |

## 安全与边界说明

- **API Key**：不在前端明文保存，统一在后端 `.env` 中配置；`/v1/maps/config` 仅返回密钥是否已配置的状态，不暴露密钥内容。
- **坐标体系**：服务端内部统一 WGS84，按 provider 输出对应坐标参考系（高德用 GCJ-02、百度用 BD-09 等）。
- **敏感信息**：`.env`、日志文件、`package-lock.json` 等均在 `.gitignore` 中排除，不会被提交。

## 下一步计划

1. 接入 Redis + PostgreSQL（会话管理 + 跑步记录）
2. 完成高德 / Google Provider 的运行时渲染适配
3. AI 边缘识别升级（图片去噪 → 向量化曲线提取）
4. 添加上架前权限文案与隐私政策
