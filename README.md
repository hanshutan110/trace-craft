# TraceCraft

TraceCraft 是一个“上传图片 -> 生成路径 -> 导航”的单仓闭环产品：前端只拿 `routeId / sessionId`，不出现 GPX 文件概念。  
当前仓库包含前端 Demo 页面（Web）与后端 API。

## 目录

```text
TraceCraft/
  backend/                # Node.js API 服务（Express）
  frontend/               # Web 验收页面（临时，后续替换为 RN）
  docs/                   # 文档
  .github/workflows/      # CI 预留
  .gitignore
```

## 快速启动（可直接看页面）

### 1. 启动后端
```bash
cd backend
copy .env.example .env   # 第一次运行先复制
npm install
npm run dev
```
访问：
- 健康检查：`GET http://localhost:3001/health`
- 地图能力：`GET http://localhost:3001/v1/maps/config`

### 2. 启动前端（页面）
```bash
cd ../frontend
npm install
npm start
```
访问：
- 演示页面：`http://localhost:3000`

两个服务分别启动后，可在浏览器按顺序进行：
1) 获取定位  
2) 上传图片  
3) 设置里程/起终点  
4) 生成路线 -> 调整 -> 重映射 -> 开始导航 -> 完成

## 当前 API（V1）
- `GET /v1/maps/config`
- `POST /v1/routes/from-image`
- `POST /v1/routes/{routeId}/adjust`
- `POST /v1/routes/{routeId}/rebase`
- `POST /v1/routes/{routeId}/start-run`
- `POST /v1/run/{sessionId}/location`
- `GET /v1/run/{sessionId}/state`
- `POST /v1/run/{sessionId}/finish`
- `GET /v1/users/me/runs`

## 与商店 App 方向的边界说明
- **前端**：现在是本地 Web Demo，便于接口验收；正式上架时会替换为 React Native（iOS/Android）。
- **API Key**：不在前端明文保存，统一放在后端 `.env` 读取；`/v1/maps/config` 仅返回是否已配置，不返回密钥内容。
- **坐标体系**：服务端统一内部 WGS84，按 provider 输出对应 CRS（如 AMap 用 GCJ-02）。

## 下一步（按你的调整计划）
1. 做 RN 页面（定位、地图渲染、导航离线降级）。  
2. 接入 Redis + PostgreSQL（会话 + 跑步记录）。  
3. 完成高德/Google Provider 的 runtime 渲染适配。  
4. 添加上架前权限文案与隐私政策。  
