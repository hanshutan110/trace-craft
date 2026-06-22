/**
 * TraceCraft 后端入口文件（TypeScript 版）
 *
 * 核心职责：
 *   1. 全局中间件：安全头、压缩、CORS、JSON 解析、请求追踪、限流
 *   2. Redis 连接 / BullMQ 队列 / Socket.IO 初始化
 *   3. 健康检查与地图配置端点
 *   4. 挂载路由模块
 *   5. 服务启动与优雅关闭
 */

import 'dotenv/config';
import http from 'http';
import path from 'path';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getMapConfigCached } from './services/map-config';
import { initStorage, storageMode } from './services/storage';
import { buildTraceId, parseUserIdAsync, successPayload, applyIfMatch } from './routes/common';
import { initRedis, isRedisConnected, getRedisClient, closeRedis } from './services/redisService';
import { initQueues, closeQueues } from './services/queueService';
import { initWebSocket, closeWebSocket, getOnlineSocketCount } from './services/wsService';
import authApi from './routes/authApi';
import routeApi from './routes/routeApi';
import sessionApi from './routes/sessionApi';
import userApi from './routes/userApi';
import discoveryApi from './routes/discoveryApi';
import communityApi from './routes/communityApi';
import adminApi from './routes/adminApi';
import { uploadRoot } from './services/assetService';
import { getPgPoolStats } from './services/postgres-storage';
import { runMigrations } from './services/migrationService';
import { logger } from './services/logger';
import { requestLogger } from './middleware/requestLogger';
import { csrfProtection, generateCsrfToken, setCsrfCookie } from './middleware/csrf';
import { assertEnvOrExit } from './services/envCheck';

const app = express();

// ===== 全局中间件 =====

// 安全响应头（XSS、Clickjacking、MIME 嗅探等防护）
// 开发环境放宽 CSP 以避免前端 HMR 被拦截
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 响应压缩（gzip / brotli），减少传输体积
app.use(compression());

// CORS 跨域控制
const allowedOrigins = (process.env.TRACECRAFT_CORS_ORIGINS || 'http://localhost:3016,http://localhost:3018')
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

// 全局限流：每个 IP 在 15 分钟窗口内最多 200 次请求
// Redis 可用时使用 RedisStore（分布式），否则回退到内存存储
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: getRedisClient()
    ? new RedisStore({ sendCommand: (...args: string[]) => getRedisClient()!.call(...args as [string, ...string[]]) as any })
    : undefined,
  message: { ok: false, code: 'rate_limit_exceeded', error: '请求过于频繁，请稍后再试', status: 429 },
  // 跳过健康检查和静态资源
  skip: (req) => req.path === '/health' || req.path.startsWith('/uploads') || req.path.startsWith('/ws'),
});
app.use(globalLimiter);

app.use('/uploads', express.static(path.resolve(uploadRoot()), {
  fallthrough: false,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}));

// 为每个请求注入追踪 ID、用户身份和幂等键
app.use(async (req: Request, _res: Response, next) => {
  req.traceId = buildTraceId(req);
  try {
    req.userId = await parseUserIdAsync(req);
    req.idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    next();
  } catch (error) {
    next(error);
  }
});
app.use(requestLogger);

// ===== 基础端点 =====

// 健康检查接口（含 Redis / WebSocket 状态）
app.get('/health', (_req: Request, res: Response) => {
  res.json(successPayload({
    service: 'tracecraft-backend',
    storage: storageMode(),
    redis: isRedisConnected(),
    postgresPool: getPgPoolStats(),
    websocketConnections: getOnlineSocketCount(),
  }));
});

// 地图配置接口，支持 ETag 缓存
app.get('/api/maps/config', applyIfMatch, async (req: Request, res: Response) => {
  const config = await getMapConfigCached();
  const cacheSeconds = (config as Record<string, unknown>).cacheSeconds as number || 300;
  const version = (config as Record<string, unknown>).mapConfigVersion as string || '';
  res.set('Cache-Control', `public,max-age=${cacheSeconds},must-revalidate`);
  res.set('ETag', `"${version}"`);
  res.json(successPayload({
    ...config,
    traceId: req.traceId,
  }));
});

// CSRF Token 获取端点（前端启动时调用一次，拿到 Token 放入请求头）
app.get('/api/csrf-token', (_req: Request, res: Response) => {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.json(successPayload({ csrfToken: token }));
});

// 对 /api 路由启用 CSRF 校验（GET/HEAD/OPTIONS 以及 multipart 跳过）
app.use('/api', csrfProtection);

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

// 全局错误处理中间件：统一捕获未处理的异常，避免裸 500
app.use((err: unknown, _req: Request, res: Response, _next: import('express').NextFunction) => {
  const message = err instanceof Error ? err.message : 'internal_server_error';
  logger.error('unhandled_error', err);
  if (message === 'cors_origin_denied') {
    res.status(403).json({ ok: false, code: 'cors_origin_denied', error: 'origin not allowed', status: 403 });
    return;
  }
  res.status(500).json({ ok: false, code: 'internal_error', error: message, status: 500 });
});

// ===== 服务启动 =====
const port = process.env.PORT || 3017;

(async () => {
  // 启动前校验环境变量（生产环境缺失必需变量时阻止启动）
  assertEnvOrExit();

  // 初始化 Redis（可选，失败时降级）
  await initRedis();

  // 正式 schema 变更统一走 db/migrations；本地可设 TRACECRAFT_AUTO_MIGRATE=0 跳过。
  if (process.env.TRACECRAFT_AUTO_MIGRATE !== '0') {
    const migrationResult = await runMigrations();
    if (migrationResult.applied.length) {
      logger.info('migrations_applied', { versions: migrationResult.applied });
    }
  }

  // 初始化数据库存储
  await initStorage();

  // 初始化 BullMQ 队列（依赖 Redis）
  await initQueues();

  // 创建 HTTP 服务器并挂载 Socket.IO
  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(Number(port), () => {
    logger.info('server_started', {
      port: Number(port),
      redis: isRedisConnected() ? 'connected' : 'disabled',
      websocketPath: '/ws',
    });
  });

  // 优雅关闭：依次关闭 Socket.IO → BullMQ → Redis → HTTP
  const shutdown = async (signal: string) => {
    logger.info('shutdown_started', { signal });
    await closeWebSocket();
    await closeQueues();
    await closeRedis();
    server.close(() => {
      logger.info('shutdown_http_closed');
      process.exit(0);
    });
    // 强制超时退出
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();
