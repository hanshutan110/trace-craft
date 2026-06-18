/**
 * TraceCraft 后端入口文件（TypeScript 版）
 *
 * 核心职责：
 *   1. 全局中间件：CORS、JSON 解析、请求追踪
 *   2. 健康检查与地图配置端点
 *   3. 挂载路由模块（routeApi / sessionApi）
 *   4. 服务启动
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { getMapConfig } from './services/map-config';
import { initStorage, storageMode } from './services/storage';
import { buildTraceId, parseUserId, successPayload, applyIfMatch } from './routes/common';
import authApi from './routes/authApi';
import routeApi from './routes/routeApi';
import sessionApi from './routes/sessionApi';
import userApi from './routes/userApi';
import discoveryApi from './routes/discoveryApi';
import communityApi from './routes/communityApi';
import adminApi from './routes/adminApi';

const app = express();

// ===== 全局中间件 =====
const allowedOrigins = (process.env.TRACECRAFT_CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('cors_origin_denied'));
  },
}));
app.use(express.json({ limit: '10mb' }));

// 为每个请求注入追踪 ID、用户身份和幂等键
app.use((req: Request, _res: Response, next) => {
  req.traceId = buildTraceId(req);
  req.userId = parseUserId(req) || null;
  req.idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  next();
});

// ===== 基础端点 =====

// 健康检查接口
app.get('/health', (_req: Request, res: Response) => {
  res.json(successPayload({
    service: 'tracecraft-backend',
    storage: storageMode(),
  }));
});

// 地图配置接口，支持 ETag 缓存
app.get('/api/maps/config', applyIfMatch, (req: Request, res: Response) => {
  const config = getMapConfig();
  res.set('Cache-Control', `public,max-age=${config.cacheSeconds},must-revalidate`);
  res.set('ETag', `"${config.mapConfigVersion}"`);
  res.json(successPayload({
    ...config,
    traceId: req.traceId,
  }));
});

// ===== 路由模块 =====
app.use('/api', authApi);
app.use('/api', userApi);
app.use('/api', routeApi);
app.use('/api', sessionApi);
app.use('/api', discoveryApi);
app.use('/api', communityApi);
app.use('/api', adminApi);

// 兜底 404 处理
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, code: 'not_found', error: 'route not found', status: 404 });
});

// ===== 服务启动 =====
const port = process.env.PORT || 3001;
(async () => {
  await initStorage();
  app.listen(Number(port), () => {
    console.log(`TraceCraft backend listening on port ${port}`);
  });
})();
