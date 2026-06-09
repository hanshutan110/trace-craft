# Frontend (TraceCraft)

TraceCraft 前端应用，基于 Vite + React + TypeScript + TailwindCSS 构建。

## 技术栈

- **框架**：React 19 + TypeScript
- **构建**：Vite 6
- **样式**：TailwindCSS 4 + Autoprefixer
- **动画**：Motion
- **图标**：Lucide React

## 快速启动

```bash
# 确保后端已启动（默认 :3001）
cd ../backend && npm run dev

# 启动前端开发服务器
npm install
npm run dev          # 开发模式 → http://localhost:3000
npm run build        # 生产构建 → dist/
npm run preview      # 预览构建产物
```

## 项目结构

```text
src/
├── App.tsx               # 主组件、屏幕路由状态管理
├── main.tsx              # 应用入口
├── types.ts              # ScreenId / PresetShape / HistoryRecord 类型
├── data.ts               # 预设形状与历史记录数据
├── i18n.ts               # 国际化（中/英双语，支持从后端获取配置）
├── index.css             # 全局样式（TailwindCSS 入口）
└── components/           # 页面组件
    ├── AppViewport.tsx
    ├── HomeAndLibrary.tsx
    ├── NavigationAndEditor.tsx
    ├── Others.tsx
    ├── TraceJourneyScreens.tsx
    ├── DiscoveryScreens.tsx
    ├── CommunityScreens.tsx
    ├── layout/
    └── screen-router/
```

## 页面流程

1. 启动页（Splash） → 自动识别登录状态
2. 引导页（Onboarding） → 首次引导 / 登录
3. 首页（Home） → 上传图片或选择形状模板
4. 快速模板 / 全局模板库 → 浏览与选择
5. 导航页 → 实时定位、偏离提示、地图渲染
6. 个人中心 → 我的轨迹、历史记录、收藏、设置
