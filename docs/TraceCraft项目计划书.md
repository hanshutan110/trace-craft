# TraceCraft 规划书（架构调整版）

**版本**：V2  
**日期**：2026-06-08  
**名称**：TraceCraft（可选名：`TraceCraft`、`RunSketch`）  
**状态**：V1.0 MVP 已入库（后台原型 + 前端 Demo 跑通）  

---

## 模块1：产品核心定位

### 一句话定义
TraceCraft 是一款“**图片/形状转跑步路径并可实时导航的闭环运动 App**”：用户上传任意图片后，系统自动生成可跑路线，并在 App 内直接导航，不出现 GPX 文件概念。

### 核心差异化优势（3点）
1. **画像式路线生成**：输入从“文字/Logo/表情包/涂鸦图”到轨迹，不需要先选路线。  
2. **目标里程闭环控制**：输入 3km/5km/半马，后台按几何保形缩放（含节点数限幅、曲率平滑）直接产出可跑路径。  
3. **地图 provider 与坐标体系统一适配**：路线引擎对坐标标准化，不受不同地图 SDK 影响，天然支持国内外切换（高德/Google 先行、百度/腾讯保留位）。

### 目标用户画像
1. **城市跑者（18-35岁）**  
   - 场景：晨练、夜跑、上下班碎片运动；不想每次手动规划路线。  
   - 痛点：路线重复、缺乏新鲜感、缺少可分享的“形状记忆”。  
2. **户外运动玩家（23-40岁）**  
   - 场景：周末徒步、越野、社交团体活动；喜欢“任务化”训练。  
   - 痛点：起点/终点固定，路线无新奇性，难以在野外快速转图做训练。  
3. **内容创作者（16-30岁）**  
   - 场景：做短视频/动态故事展示，用路线做内容互动传播。  
   - 痛点：不想被 GPX 文件、地图操作、参数门槛打断创作流程。

---

## 模块2：功能架构（按版本）

### V1.0 MVP（2-4周）
目标：闭环可用（上传 -> 生图 -> 调整里程 -> 开始导航 -> 完成报告），单仓内前后端分层。

#### 功能清单
- **定位优先打底**（半自动）：启动检测定位权限；失败则提示授权并阻断“开始导航”。
- **地图配置获取**（自动）：`GET /v1/maps/config` 返回 provider 列表、能力、密钥可用状态。
- **图片上传生成路线**（半自动）：`POST /v1/routes/from-image`，参数含 provider、起点、可选终点、目标里程。
- **路线里程缩放**（自动）：`POST /v1/routes/{routeId}/adjust`，保留形状并做角度平滑。
- **起点/终点重映射**（半自动）：`POST /v1/routes/{routeId}/rebase`，不重识别即可重锚定。
- **导航会话**（自动）：`start-run` -> `location` 上报 -> `state` 查询 -> `finish`。
- **偏离提示**（自动）：距离阈值分级提示，弱网时给出“本地导航降级”文案。
- **历史列表**（自动）：`GET /v1/users/me/runs`。

> 手动项：图片上传、是否编辑起点终点、是否触发开始导航。  
> 自动项：坐标转换、路径缩放、会话进度计算、偏离评估。

### V2.0 增强（1-2个月）
- AI 边缘识别升级（先行：OpenCV/ML Kit/ONNX 分支，后续自研模型）。  
- 历史/收藏路线库、重复生成优化。  
- 分享卡片（运动数据摘要），不显示 GPX。  
- 地图 provider 的 runtime 切换和 provider 限流策略。

### V3.0 社区版（3-6个月）
- 赛事/挑战模板（距离、时间、路线标签）。  
- 排行榜与社交组队。  
- 报名合作方赛事导入、路线挑战打卡审核。  
- 商店会员体系（Pro/Creator）与创作激励。

---

## 模块3：技术选型

### 1）前端
- **默认：React Native（Expo 或裸 RN）**
- 原因：  
  - 一次开发覆盖 iOS/Android；  
  - 可先接入 `react-native-maps` + 原生插件化 provider；  
  - 与现有 Node.js 接口生态兼容，闭环调用简单。  
- 说明：当前仓内保留 web demo 页面用于本地验收，后续替换为 RN App。

### 2）地图 SDK（定位驱动 + 多 provider 抽象）
- 先用：**高德（国内默认） + Google（国际兜底）**
- 预留：**百度/腾讯（配置开关 + stub）**
- 成本与策略：
  - 国内场景先走 AMap：更贴近国内坐标体系，偏差更小。  
  - 国际场景走 Google：覆盖海外、导航体验更统一。  
  - 后端统一返回 providerHint 与 crsHint，前端只做渲染。

### 3）轨迹识别算法
- **简单版（V1）**：基于图像轮廓提取 + 多边形抽样（OpenCV/像素连通/骨架化）；先落“可用闭环 demo”。  
- **AI 版（V2）**：  
  - 输入：图片噪声/涂鸦/文字去噪 + 分割。  
  - 输出：向量化曲线 + 关键点序列。  
  - 目标：识别率、起点-终点稳定性、尖角抑制。

### 4）后端
- **Node.js + Express** 保留，原因：快速实现 API 契约、便于接入已有服务。  
- 持久化：  
  - V1：文件态持久化（已实现 state.json，避免服务重启丢失）。  
  - 后续 30 天内替换：Redis（会话） + PostgreSQL（route/run）。
- 不再直接读/写前端文件；所有地图逻辑与会话在后端集中。

---

## 模块4：用户操作流程

```mermaid
flowchart TD
  A[打开 App] --> B[请求定位权限]
  B -->|拒绝| C[阻止开始导航 + 引导授权/手动起点]
  B -->|同意| D[读取当前位置] --> E[获取地图配置 /v1/maps/config]
  E --> F[上传图片]
  F --> G[选择 provider/起点/终点]
  G --> H[POST /v1/routes/from-image]
  H --> I[返回 routeId + route 元数据]
  I --> J[可选：调整公里数 POST /adjust]
  J --> K[可选：重设起终点 POST /rebase]
  K --> L[开始导航 POST /start-run]
  L --> M[实时上报位置 POST /run/{sessionId}/location]
  M --> N[轮询状态 GET /run/{sessionId}/state]
  N --> O[偏离提示+导向动作]
  O --> P[完成 POST /run/{sessionId}/finish]
  P --> Q[回显闭环报告（不导出 GPX）]
```

**关键转化点**：  
1) 定位授权成功（决定是否可开跑）；2) 起点/终点是否确认（影响后续重映射）；3) 开始导航触发。

---

## 模块5：关键算法

### 5.1 图片边缘到经纬度转换
1. 图像预处理：灰度化 -> 去噪 -> Canny/阈值分割。  
2. 轮廓提取：找到最大/可疑闭合轮廓，去除小噪点。  
3. 骨架化：边缘中心化为单像素路径。  
4. 坐标采样：按弧长重采样，得到统一长度序列。  
5. 投影到地理坐标：  
   - 以起点为锚点，使用“像素比例尺”映射；  
   - 先生成内部 WGS84 路径，再由 provider 映射到 GCJ-02/BD-09。  

示例伪代码：
```js
function imageToPath(image, startPoint, provider){
  img = preprocess(image)
  contour = extractMainContour(img)
  skeleton = thin(contour)
  points2D = resampleByArcLength(skeleton, targetCount)
  pathWgs84 = points2D.map((p)=>projectToWgs84(p, startPoint, origin2D, scale))
  return convertPath(pathWgs84, 'wgs84', providerToCrs(provider))
}
```

### 5.2 按公里数缩放但保形
```js
function scalePathPreserveShape(points, targetMeters, options){
  L0 = pathLength(points)
  k = targetMeters / L0
  center = centroid(points)
  scaled = points.map(p => {
    return {
      lat: center.lat + (p.lat - center.lat) * k,
      lng: center.lng + (p.lng - center.lng) * k
    }
  })
  scaled = limitPointCount(scaled, options.minPoints, options.maxPoints)
  return angleSmooth(scaled)
}
```
- 结果保持路径整体形态；
- 通过 `min/max waypoint` 避免抖动/过稀疏；
- 与 V1 现有 `angleSmooth` 和 `resampleByDistance` 对齐。

---

## 模块6：导航体验
- **偏离提示**：每 2 秒计算 `最新定位点 -> 路线最近点距离 d`。  
  - d < 10m：正常  
  - 10-25m：轻提示  
  - >25m：重提示 + 给予“回撤到最近路点”指引  
- **路径比对**：持续比较 `actualPath` 与 `route.points`，输出 `deviationM / progressPct / currentAccuracy`。  
- **弱网策略**：  
  - 无法上报时本地缓冲位置，提示“定位更新中”；  
  - 无法取图层时退化为“离线提示模式”（文字方向 + 距离目标）；  
  - 结束时补算完成率，确保不丢报告。

---

## 模块7：商业计划
### 定价
- 免费：每日 3 条路线、无历史回放导出、每月最多 10 次导航。  
- Pro（¥39/月）：无限生成、离线缓存、重映射次数上限提升、路线质量增强。  
- Creator（¥69/月）：多 provider 试用优先级、模板打包、作品页管理。

### 1000种子用户获取
1. 跑团社群（跑步爱好者、骑行群）做任务赛  
2. 内容博主联动（每周“涂鸦挑战路线”）  
3. 地方跑场馆与健身工作室联动二维码试用  
4. 校园社团合作（挑战赛）  
5. 应用内转发奖励（首次安装送训练次数）

### 3个月成本（保守估算）
- 地图与定位：2-3.5万 RMB（国内外按量试用 + 降级方案）  
- 服务端：2-4人·月，约 4-8万 RMB  
- 存储与运维：1-2万 RMB  

---

## 模块8：风险与应对
1. **定位精度不稳定**：预置 provider 兜底+偏离阈值动态化，增加“手动修正偏航点”。  
2. **识别率不达标**：AI 识别不触发时降级为手工关键点确认。  
3. **多 provider 坐标漂移**：统一内部 WGS84，后端统一转换，session 内返回 CRS 版本号。  
4. **商店审核风险（隐私）**：定位文案、后台定位时机、数据保留期写入设置页并在首次授权页说明。

---

## 模块9：开发时间线（90天）
- **D1-7**：前端定位接入、地图 provider 接口、maps config。  
- **D8-14**：后端 route/session 数据模型完善、rebase、provider 特性返回。  
- **D15-21**：启动 Redis/PostgreSQL 迁移（保留 file fallback）。  
- **D22-30**：AMap/Google 双 provider 联调 + 弱网降级。  
- **D31-45**：百度/腾讯 provider stub 与开关。  
- **D46-60**：体验优化、QA、Playwright 验收。  
- **D61-75**：商店资质文本、隐私页、权限说明。  
- **D76-90**：灰度发布 + 跑团种子试点。

---

## 模块10：24小时第一步
1. 在 `backend/.env` 配置地图服务 Key（仅服务端）并启动后端。  
2. 调用 `GET /v1/maps/config` 确认 provider 列表和 key 状态。  
3. 在前端 Demo 里完成一次“定位-上传-生成-调整-重映射-开始-完成”链路。  
4. 编写 `docs/TraceCraft-API-Contract.md`（routes、run、maps）用于 RN 迁移。  
5. 制作 iOS/Android 权限文案与隐私页（位置权限、数据留存、匿名化策略）。

---

## 附录：当前实现现状（可落地）
- 已落地：route/session 持久化（文件态）、定位字段、`providerHint/crsHint`、`rebase`、`maps/config`、`start-run/location/state/finish`。  
- 待落地：RN 原生页面、API key 的正式环境化、Redis/PostgreSQL、百度/腾讯真实地图适配器 SDK。  
