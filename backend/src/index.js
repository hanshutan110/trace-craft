const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');

const {
  createRouteFromImage,
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
} = require('./services/routeService');
const { initStorage, storageMode } = require('./services/storage');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

function buildTraceId(req) {
  const headerId = req.headers['x-request-id'] || req.headers['x-trace-id'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim();
  }
  return `trace-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function parseUserId(req) {
  // 统一解析用户身份来源：优先 header，再回退到 body/query，避免不同调用端行为分歧。
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
      } catch (_err) {
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

function asPositiveInt(value, fallback, min = 1, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.max(min, Math.min(max, Math.floor(num)));
  return clamped;
}

function successPayload(data) {
  return {
    ok: true,
    ...data,
  };
}

function errorPayload(message, code, status = 500, extra = {}) {
  return {
    ok: false,
    code,
    error: message,
    status,
    ...extra,
  };
}

function normalizeLocationBody(body) {
  // 仅保留可解析的经纬度时间字段，防止脏数据写入 session 路径导致下游计算异常。
  if (!body || typeof body !== 'object') return {};
  return {
    lat: Number(body.lat),
    lng: Number(body.lng),
    accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null,
    ts: Number.isFinite(Number(body.ts)) ? Number(body.ts) : Date.now(),
  };
}

function parseJsonField(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return value;
  }
}

function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json(errorPayload('user not authenticated', 'auth_required', 401));
  }
  return next();
}

function applyIfMatch(req, res, next) {
  const etag = req.headers['if-none-match'];
  if (!etag) return next();
  const config = getMapConfig();
  const currentTag = `"${config.mapConfigVersion}"`;
  if (etag === currentTag) {
    return res.status(304).end();
  }
  return next();
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  req.traceId = buildTraceId(req);
  req.userId = parseUserId(req) || null;
  req.idempotencyKey = req.headers['idempotency-key'];
  next();
});

app.get('/health', (_req, res) => {
  res.json(successPayload({
    service: 'tracecraft-backend',
    storage: storageMode(),
  }));
});

app.get('/v1/maps/config', applyIfMatch, (req, res) => {
  const config = getMapConfig();
  res.set('Cache-Control', `public,max-age=${config.cacheSeconds},must-revalidate`);
  res.set('ETag', `"${config.mapConfigVersion}"`);
  res.json(successPayload({
    ...config,
    traceId: req.traceId,
  }));
});

app.post('/v1/routes/from-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorPayload('missing image file', 'missing_image', 400));
    }
    const body = { ...req.body };
    const route = await createRouteFromImage({
      userId: req.userId,
      filename: req.file.originalname || 'upload',
      buffer: req.file.buffer,
      provider: normalizeProvider(body.provider),
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: parseJsonField(body.startPoint),
      endPoint: parseJsonField(body.endPoint),
    });
    res.json(successPayload({
      route,
      traceId: req.traceId,
      currentState: 'ready',
      nextAction: 'adjust_or_start',
      sessionId: null,
      version: route?.version || 1,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('route generation failed', 'route_generation_failed', 500));
  }
});

app.get('/v1/routes/:routeId', requireAuth, async (req, res) => {
  try {
    const routeId = req.params.routeId;
    const runs = await listUserRuns(req.userId, {
      page: 1,
      limit: 1,
      search: routeId,
    });
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

app.post('/v1/routes/:routeId/adjust', requireAuth, async (req, res) => {
  try {
    const { routeId } = req.params;
    const targetKm = Number(req.body.targetKm);
    const route = await adjustRouteDistance(routeId, targetKm, req.userId);
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
    if (err.message === 'route_version_conflict') {
      return res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
    }
    return res.status(500).json(errorPayload('adjust failed', 'adjust_failed', 500));
  }
});

app.post('/v1/routes/:routeId/rebase', requireAuth, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { startPoint, endPoint, strategy } = req.body || {};
    const route = await rebaseRoute(routeId, startPoint, endPoint, strategy, req.userId);
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
    if (err.message === 'route_version_conflict') {
      return res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
    }
    return res.status(500).json(errorPayload('rebase failed', 'rebase_failed', 500));
  }
});

app.post('/v1/routes/:routeId/start-run', requireAuth, async (req, res) => {
  try {
    const { routeId } = req.params;
    const provider = parseJsonField(req.body && req.body.provider);
    const sessionBundle = await startRunSession(routeId, req.userId, provider, req.idempotencyKey);
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
    return res.status(500).json(errorPayload('start run failed', 'start_run_failed', 500));
  }
});

app.get('/v1/run/:sessionId/state', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const state = await getRunSessionState(sessionId, req.userId);
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

app.post('/v1/run/:sessionId/pause', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const state = await updateRunSessionState(sessionId, req.userId, SESSION_STATUS.PAUSED);
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

app.post('/v1/run/:sessionId/resume', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const state = await updateRunSessionState(sessionId, req.userId, SESSION_STATUS.RUNNING);
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

app.post('/v1/run/:sessionId/location', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const point = normalizeLocationBody(req.body || {});
    const updated = await appendLocation(sessionId, point, req.userId);
    if (!updated) {
      return res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
    }
    if (!updated.accepted) {
      return res.status(409).json(errorPayload(updated.reason || 'location not accepted', 'location_rejected', 409, {
        reason: updated.reason,
        pointIndex: updated.pointIndex,
        lagHint: updated.lagHint,
      }));
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

app.post('/v1/run/:sessionId/finish', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const body = req.body || {};
    const actualPath = Array.isArray(body.actualPath) ? body.actualPath : [];
    const result = await finishRunSession(sessionId, actualPath, req.userId);
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

app.get('/v1/users/me/runs', requireAuth, async (req, res) => {
  try {
    const page = asPositiveInt(req.query.page, 1, 1, 200);
    const limit = asPositiveInt(req.query.limit, 20, 1, 100);
    const payload = await listUserRuns(req.userId, {
      page,
      limit,
      status: req.query.status,
      search: req.query.search,
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

app.use((req, res) => {
  res.status(404).json(errorPayload('route not found', 'not_found', 404));
});

const port = process.env.PORT || 3001;
(async () => {
  await initStorage();
  app.listen(port, () => {
    console.log(`TraceCraft backend listening on port ${port}`);
  });
})();
