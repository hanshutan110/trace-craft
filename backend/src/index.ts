/**
 * TraceCraft 后端入口文件（TypeScript 版）
 *
 * 核心职责：
 *   1. 定义 RESTful API 路由（路线生成、导航会话、地图配置等）
 *   2. 中间件：CORS、JSON 解析、用户鉴权、请求追踪
 *   3. 统一的成功/失败响应格式
 *
 * 业务流程：上传图片 → 生成路线 → 调整参数 → 开始导航 → 实时上报位置 → 完成跑步
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';

import {
  createRouteFromImage,
  createRouteFromTemplate,
  adjustRouteDistance,
  rebaseRoute,
  startRunSession,
  appendLocation,
  getRunSessionState,
  finishRunSession,
  listUserRuns,
  getMapConfig,
  normalizeProvider,
  updateRunSessionState,
  SESSION_STATUS,
} from './services/routeService';
import type { SessionState } from './services/routeService';
import type { GeoPoint } from './utils/geo';
import { initStorage, storageMode } from './services/storage';

// ===== Express Request 类型扩展 =====

/** 扩展 Express Request，注入追踪 ID、用户身份和幂等键 */
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      userId?: string | null;
      idempotencyKey?: string;
    }
  }
}

const app = express();
// multer 使用内存存储，图片上传后暂存到 buffer，不落盘
const upload = multer({ storage: multer.memoryStorage() });

// ===== 工具函数 =====

/** 构建请求追踪 ID，优先使用客户端传入的 header，否则自动生成 */
function buildTraceId(req: Request): string {
  const headerId = req.headers['x-request-id'] || req.headers['x-trace-id'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim();
  }
  return `trace-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

/** 解析用户身份，优先 Authorization header，再回退到 body/query */
function parseUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === 'string') {
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      if (token.startsWith('user:')) {
        return token.slice(5);
      }
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        return decoded.startsWith('user:') ? decoded.slice(5) : decoded;
      } catch {
        return token;
      }
    }
  }
  if (typeof req.headers['x-user-id'] === 'string' && req.headers['x-user-id'].trim()) {
    return req.headers['x-user-id'].trim();
  }
  if (req.body && typeof req.body.userId === 'string' && req.body.userId.trim()) {
    return req.body.userId.trim();
  }
  if (req.query.userId && typeof req.query.userId === 'string' && req.query.userId.trim()) {
    return req.query.userId.trim();
  }
  return null;
}

/** 将参数安全转换为正整数，并限制在 [min, max] 范围内 */
function asPositiveInt(value: unknown, fallback: number, min: number = 1, max: number = 100): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.max(min, Math.min(max, Math.floor(num)));
  return clamped;
}

/** 统一成功响应格式 */
function successPayload(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    ...data,
  };
}

/** 统一失败响应格式 */
function errorPayload(
  message: string,
  code: string,
  status: number = 500,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ok: false,
    code,
    error: message,
    status,
    ...extra,
  };
}

/** 标准化位置上报数据 */
function normalizeLocationBody(body: Record<string, unknown> | null): { lat: number; lng: number; accuracy: number | null; ts: number } {
  if (!body || typeof body !== 'object') return { lat: NaN, lng: NaN, accuracy: null, ts: Date.now() };
  return {
    lat: Number(body.lat),
    lng: Number(body.lng),
    accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null,
    ts: Number.isFinite(Number(body.ts)) ? Number(body.ts) : Date.now(),
  };
}

function toOptionalNumber(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

/** 尝试将字符串解析为 JSON，失败则原样返回 */
function parseJsonField<T>(value: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return value;
  }
}

// ===== 中间件 =====

/** 鉴权中间件：未识别到用户身份时返回 401 */
function requireAuth(req: Request, res: Response, next: NextFunction): void | Response {
  if (!req.userId) {
    return res.status(401).json(errorPayload('user not authenticated', 'auth_required', 401));
  }
  return next();
}

/** ETag 缓存中间件：客户端携带 If-None-Match 且配置未变更时返回 304 */
function applyIfMatch(req: Request, res: Response, next: NextFunction): void | Response {
  const etag = req.headers['if-none-match'];
  if (!etag) return next();
  const config = getMapConfig();
  const currentTag = `"${config.mapConfigVersion}"`;
  if (etag === currentTag) {
    return res.status(304).end();
  }
  return next();
}

// ===== 全局中间件 =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 为每个请求注入追踪 ID、用户身份和幂等键
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.traceId = buildTraceId(req);
  req.userId = parseUserId(req) || null;
  req.idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  next();
});

// ===== API 路由定义 =====

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

// 核心接口：上传图片生成路线
app.post('/api/routes', upload.single('image'), requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorPayload('missing image file', 'missing_image', 400));
    }
    const body = { ...req.body };
    const route = await createRouteFromImage({
      userId: req.userId ?? null,
      filename: req.file.originalname || 'upload',
      buffer: req.file.buffer,
      provider: body.provider,
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: parseJsonField(body.startPoint),
      endPoint: parseJsonField(body.endPoint),
      currentAccuracy: toOptionalNumber(body.currentAccuracy),
    });
    res.json(successPayload({
      route,
      traceId: req.traceId,
      currentState: 'ready',
      nextAction: 'preview_route',
      sessionId: null,
      version: route?.version || 1,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('route generation failed', 'route_generation_failed', 500));
  }
});

// 基础模板生成路线
app.post('/api/routes/from-template', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const route = await createRouteFromTemplate({
      userId: req.userId ?? null,
      shapeType: typeof body.shapeType === 'string' ? body.shapeType : 'star',
      provider: body.provider,
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: body.startPoint,
      currentAccuracy: toOptionalNumber(body.currentAccuracy),
    });
    res.json(successPayload({
      route,
      traceId: req.traceId,
      currentState: 'ready',
      nextAction: 'preview_route',
      sessionId: null,
      version: route?.version || 1,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('template route generation failed', 'template_route_generation_failed', 500));
  }
});

// 查询单条路线详情
app.get('/api/routes/:routeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const routeId = req.params.routeId as string;
    const runs = await listUserRuns(req.userId ?? null, { page: 1, limit: 1, search: routeId });
    const route = runs.runs.find((item) => item.id === routeId);
    if (!route) {
      return res.status(404).json(errorPayload('route not found', 'route_not_found', 404));
    }
    res.json(successPayload({ route, traceId: req.traceId }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('fetch route failed', 'route_fetch_failed', 500));
  }
});

// 调整路线距离
app.put('/api/routes/:routeId/adjust', requireAuth, async (req: Request, res: Response) => {
  try {
    const routeId = req.params.routeId as string;
    const targetKm = Number(req.body.targetKm);
    const route = await adjustRouteDistance(routeId, targetKm, req.userId ?? null);
    if (!route) {
      return res.status(404).json(errorPayload('route not found or invalid target', 'route_not_found', 404));
    }
    return res.json(successPayload({
      route,
      routeId,
      version: route.version,
      updatedAt: route.updatedAt,
      traceId: req.traceId,
      nextAction: 'start_run',
    }));
  } catch (err) {
    console.error(err);
    if ((err as Error).message === 'route_version_conflict') {
      return res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
    }
    return res.status(500).json(errorPayload('adjust failed', 'adjust_failed', 500));
  }
});

// 重映射路线起终点
app.put('/api/routes/:routeId/rebase', requireAuth, async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params as { routeId: string };
    const { startPoint, endPoint, strategy } = req.body || {};
    const route = await rebaseRoute(routeId, startPoint, endPoint, strategy, req.userId ?? null);
    if (!route) {
      return res.status(404).json(errorPayload('route not found', 'route_not_found', 404));
    }
    return res.json(successPayload({
      route,
      routeId,
      version: route.version,
      updatedAt: route.updatedAt,
      traceId: req.traceId,
      nextAction: 'start_run',
    }));
  } catch (err) {
    console.error(err);
    if ((err as Error).message === 'route_version_conflict') {
      return res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
    }
    return res.status(500).json(errorPayload('rebase failed', 'rebase_failed', 500));
  }
});

// 开始跑步会话
app.post('/api/routes/:routeId/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params as { routeId: string };
    const provider = parseJsonField(req.body?.provider);
    const riskConfirmed = req.body?.riskConfirmed === true || req.body?.riskConfirmed === 'true';
    const sessionBundle = await startRunSession(routeId, req.userId ?? null, provider, req.idempotencyKey, riskConfirmed);
    if (!sessionBundle) {
      return res.status(404).json(errorPayload('route not found', 'route_not_found', 404));
    }
    return res.json(successPayload({
      session: sessionBundle.session,
      sessionId: sessionBundle.session.id,
      currentState: sessionBundle.currentState,
      nextAction: sessionBundle.nextAction,
      resumed: sessionBundle.resumed || false,
      traceId: req.traceId,
      routeId,
    }));
  } catch (err) {
    console.error(err);
    if ((err as Error).message === 'route_high_risk') {
      return res.status(409).json(errorPayload('route risk is too high to start', 'route_high_risk', 409));
    }
    if ((err as Error).message === 'route_risk_confirmation_required') {
      return res.status(409).json(errorPayload('route risk confirmation required', 'route_risk_confirmation_required', 409));
    }
    return res.status(500).json(errorPayload('start run failed', 'start_run_failed', 500));
  }
});

// 查询跑步会话实时状态
app.get('/api/sessions/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const state = await getRunSessionState(sessionId, req.userId ?? null);
    if (!state) {
      return res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
    }
    res.json(successPayload({
      state,
      traceId: req.traceId,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('get state failed', 'state_fetch_failed', 500));
  }
});

// 暂停跑步会话
app.post('/api/sessions/:sessionId/pause', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const state = await updateRunSessionState(sessionId, req.userId ?? null, SESSION_STATUS.PAUSED);
    if (!state) {
      return res.status(409).json(errorPayload('cannot pause session', 'session_not_pauseable', 409));
    }
    res.json(successPayload({
      state,
      traceId: req.traceId,
      nextAction: 'resume',
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('pause failed', 'pause_failed', 500));
  }
});

// 恢复跑步会话
app.post('/api/sessions/:sessionId/resume', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const state = await updateRunSessionState(sessionId, req.userId ?? null, SESSION_STATUS.RUNNING);
    if (!state) {
      return res.status(409).json(errorPayload('cannot resume session', 'session_not_resumable', 409));
    }
    res.json(successPayload({
      state,
      traceId: req.traceId,
      nextAction: 'report_location',
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('resume failed', 'resume_failed', 500));
  }
});

// 上报实时位置点
app.post('/api/sessions/:sessionId/location', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const point = normalizeLocationBody(req.body || {});
    const updated = await appendLocation(sessionId, point as GeoPoint, req.userId ?? null);
    if (!updated) {
      return res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
    }
    if (!updated.accepted) {
      return res.status(409).json(
        errorPayload(updated.reason || 'location not accepted', 'location_rejected', 409, {
          reason: updated.reason,
          pointIndex: updated.pointIndex,
          lagHint: updated.lagHint,
        })
      );
    }
    return res.json(successPayload({
      acceptedAt: new Date().toISOString(),
      pointIndex: updated.pointIndex,
      lagHint: updated.lagHint,
      routeState: updated.routeState,
      traceId: req.traceId,
      nextAction: 'report_location',
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorPayload('location update failed', 'location_failed', 500));
  }
});

// 结束跑步会话
app.post('/api/sessions/:sessionId/finish', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body || {};
    const actualPath = Array.isArray(body.actualPath) ? body.actualPath : [];
    const result = await finishRunSession(sessionId, actualPath, req.userId ?? null);
    if (!result) {
      return res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
    }
    return res.json(successPayload({
      result,
      sessionId,
      traceId: req.traceId,
      nextAction: 'summary',
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorPayload('finish failed', 'finish_failed', 500));
  }
});

// 查询当前用户的路线列表
app.get('/api/runs', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = asPositiveInt(req.query.page, 1, 1, 200);
    const limit = asPositiveInt(req.query.limit, 20, 1, 100);
    const payload = await listUserRuns(req.userId ?? null, {
      page,
      limit,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json(successPayload({
      userId: req.userId,
      ...payload,
      traceId: req.traceId,
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorPayload('list runs failed', 'list_runs_failed', 500));
  }
});

// 兜底 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json(errorPayload('route not found', 'not_found', 404));
});

// ===== 服务启动 =====
const port = process.env.PORT || 3001;
(async () => {
  await initStorage();
  app.listen(Number(port), () => {
    console.log(`TraceCraft backend listening on port ${port}`);
  });
})();
