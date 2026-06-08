# Frontend (TraceCraft)

目标：提供移动端最小可用闭环页面，不出现 GPX 及文件导出概念。

当前文件仅包含 MVP 骨架与 API 示例，页面顺序：

1. 上传图片（当前使用占位上传对象）
2. 输入目标公里数并调整
3. 开始导航（请求后端 session）
4. 结束后显示偏离率、完成里程

运行前请先启动后端：

```bash
cd ../backend
npm install
npm run dev
```

前端脚本为占位，建议后续替换为 Expo 初始化工程（`npx create-expo-app`）并迁移 `App.js` 与 `src/services/api.js`。

