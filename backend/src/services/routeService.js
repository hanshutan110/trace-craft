const crypto = require('crypto');
const { pointDistanceMeters, scalePathPreserveShape, latLngCentroid, resampleByDistance, angleSmooth } = require('../utils/geo');
const { convertPoint } = require('../utils/coordAdapter');
const {
  normalizePoint,
  createRouteRecord,
  upsertRouteRecord,
  getRouteRecord,
  saveSessionRecord,
  getSessionRecord,
  appendSessionLocationRecord,
  updateSessionRecord,
  listUserRuns: listUserRoutes,
  initStorage,
} = require('./storage');

const DEFAULT_PROVIDER = process.env.MAP_PROVIDER_DEFAULT || 'amap';
const MAP_PROVIDER_LIST = (process.env.MAP_PROVIDER_LIST || 'amap,google,baidu,tencent')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const DEFAULT_LOCALE = process.env.MAP_LOCALE_FALLBACK || 'zh-CN';

const LOCALE_LABELS = {
  'zh-CN': '中文',
  'en-US': 'English',
};

const SESSION_STATUS = {
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
  FAILED: 'failed',
};

const SESSION_NEXT_ACTION = {
  [SESSION_STATUS.CREATED]: 'start_run',
  [SESSION_STATUS.RUNNING]: 'report_location',
  [SESSION_STATUS.PAUSED]: 'resume_or_review',
  [SESSION_STATUS.FINISHED]: 'summary',
  [SESSION_STATUS.FAILED]: 'retry_or_rebase',
};

function nowIso() {
  // 统一时间戳格式，前后端都使用 ISO 8601，便于日志与审计对齐。
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const SUPPORTED_LOCALES = (() => {
  const locales = splitList(process.env.MAP_LOCALES || 'zh-CN,en-US');
  const uniq = [...new Set(locales)];
  return uniq.length ? uniq : ['zh-CN', 'en-US'];
})();

function withLocaleFallback(fallback) {
  return SUPPORTED_LOCALES.includes(fallback) ? fallback : (SUPPORTED_LOCALES[0] || 'zh-CN');
}

const PROVIDER_FEATURES = {
  amap: { supportPoi: true, offlineTile: false, navHints: true, geocode: true },
  google: { supportPoi: true, offlineTile: false, navHints: true, geocode: true },
  baidu: { supportPoi: true, offlineTile: false, navHints: true },
  tencent: { supportPoi: true, offlineTile: false, navHints: true },
};

const PROVIDER_KEY_ENV = {
  amap: 'AMAP_KEY',
  google: 'GOOGLE_MAPS_KEY',
  baidu: 'BAIDU_MAP_KEY',
  tencent: 'TENCENT_MAP_KEY',
};

function randomSeedFromString(value) {
  const h = crypto.createHash('md5').update(String(value)).digest('hex');
  const base = parseInt(h.substring(0, 8), 16);
  return base / 0xffffffff;
}

function normalizeProvider(value) {
  if (!value) return DEFAULT_PROVIDER;
  if (MAP_PROVIDER_LIST.includes(value)) return value;
  return DEFAULT_PROVIDER;
}

function normalizeLocale(value) {
  if (!value || typeof value !== 'string') return DEFAULT_LOCALE;
  const normalized = value.trim();
  if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  return withLocaleFallback(DEFAULT_LOCALE);
}

function parseLocaleLabels(value) {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (_err) {
    return {};
  }
}

function parsePoint(raw, fallback) {
  const point = normalizePoint(raw || {});
  if (point) return point;
  return fallback || null;
}

function getLocaleMeta() {
  const safeDefault = withLocaleFallback(DEFAULT_LOCALE);
  const labelsFromEnv = parseLocaleLabels(process.env.MAP_LOCALE_LABELS || '');
  const locales = SUPPORTED_LOCALES.length > 0 ? SUPPORTED_LOCALES : ['zh-CN', 'en-US'];
  return {
    localeFallback: safeDefault,
    locales,
    localeLabels: locales.map((code) => ({
      code,
      label: labelsFromEnv[code] || LOCALE_LABELS[code] || code,
    })),
    localeVersion: process.env.MAP_LOCALE_LABEL_VERSION || 'v1',
  };
}

function routeBounds(points) {
  if (!points.length) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  points.forEach((point) => {
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
    if (point.lng < minLng) minLng = point.lng;
    if (point.lng > maxLng) maxLng = point.lng;
  });
  return { minLat, maxLat, minLng, maxLng };
}

function routeDistance(points) {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    sum += pointDistanceMeters(points[i - 1], points[i]);
  }
  return sum;
}

function routeMeta(points) {
  const distanceM = routeDistance(points);
  const start = points[0];
  const end = points[points.length - 1];
  return { distanceM, start, end };
}

function routePathDistanceMeters(path) {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < path.length; i += 1) {
    sum += pointDistanceMeters(path[i - 1], path[i]);
  }
  return sum;
}

function generateDemoPoints(seed, count, center) {
  const origin = center || { lat: 31.2304, lng: 121.4737 };
  const radius = 0.004 + seed * 0.0015;
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const wobble = (seed - 0.5) * 0.3;
    const r = radius * (0.6 + 0.4 * Math.sin(angle * 3 + wobble * 10));
    points.push({
      lat: origin.lat + Math.cos(angle) * r,
      lng: origin.lng + Math.sin(angle) * r,
      ts: Date.now() + i * 1000,
    });
  }
  return points;
}

function normalizeRouteForProvider(route, provider) {
  const providerNorm = normalizeProvider(provider);
  const crsHint = providerNorm === 'google' ? 'wgs84' : 'gcj02';
  const toProvider = (point) => {
    if (providerNorm === 'google') {
      return point;
    }
    if (providerNorm === 'baidu') {
      return convertPoint(point, 'wgs84', 'bd09');
    }
    return convertPoint(point, 'wgs84', 'gcj02');
  };
  return {
    ...route,
    providerHint: providerNorm,
    crsHint,
    points: route.points.map((point) => {
      const converted = toProvider(point);
      return { ...point, lat: converted.lat, lng: converted.lng };
    }),
  };
}

function rebaseRoutePoints(route, startPoint, endPoint) {
  const points = route.points.map((point) => ({ lat: point.lat, lng: point.lng }));
  const origin = route.meta.start;
  const targetStart = startPoint || origin;
  const shift = {
    lat: targetStart.lat - origin.lat,
    lng: targetStart.lng - origin.lng,
  };
  let rebased = points.map((point) => ({ lat: point.lat + shift.lat, lng: point.lng + shift.lng }));
  if (endPoint) {
    const shiftedEnd = rebased[rebased.length - 1];
    const endShift = {
      lat: endPoint.lat - shiftedEnd.lat,
      lng: endPoint.lng - shiftedEnd.lng,
    };
    rebased = rebased.map((point) => ({
      lat: point.lat + endShift.lat,
      lng: point.lng + endShift.lng,
    }));
  }
  return angleSmooth(rebased);
}

function nearestDistanceToRoute(point, routePoints) {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 1; i < routePoints.length; i += 1) {
    const a = routePoints[i - 1];
    const b = routePoints[i];
    const d1 = pointDistanceMeters(point, a);
    const d2 = pointDistanceMeters(point, b);
    min = Math.min(min, d1, d2);
  }
  return min;
}

function computeSessionState(session, route) {
  if (!session || !route) return null;
  const actualPath = Array.isArray(session.actualPath) ? session.actualPath : [];
  const status = session.status || SESSION_STATUS.CREATED;
  const plannedDistance = Number(route?.meta?.distanceM || 0);
  const traveledDistance = routePathDistanceMeters(actualPath);
  const latestPoint = actualPath.length ? actualPath[actualPath.length - 1] : (route.points[0] || null);
  const deviation = latestPoint ? nearestDistanceToRoute(latestPoint, route.points) : Number.POSITIVE_INFINITY;
  const progressPct = plannedDistance > 0 ? Math.min(100, Math.max(0, Math.round((traveledDistance / plannedDistance) * 100))) : 0;
  return {
    sessionId: session.id,
    routeId: route.id,
    status,
    progressPct,
    lastPosition: latestPoint || route.points[0] || null,
    deviationM: Number.isFinite(deviation) ? Math.round(deviation) : null,
    needRedirect: Number.isFinite(deviation) ? deviation > 25 : false,
    currentAccuracy: session.currentAccuracy,
    deviationScore: session.deviationScore || 0,
    pointCount: actualPath.length,
    version: session.version || 1,
    isTerminal: [SESSION_STATUS.FINISHED, SESSION_STATUS.FAILED].includes(status),
    currentState: status,
    nextAction: SESSION_NEXT_ACTION[status] || 'report_location',
    lastUpdatedAt: session.lastStateAt || nowIso(),
  };
}

function toPositiveNumber(value, fallback) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

async function createRouteFromImage({
  userId,
  filename,
  buffer,
  provider,
  locale,
  targetKm,
  startPoint,
  endPoint,
}) {
  await initStorage();
  const seed = randomSeedFromString(filename + (buffer ? buffer.length : 0));
  const baseStart = normalizePoint(startPoint) || parsePoint(startPoint, { lat: 31.2304, lng: 121.4737 });
  const routeId = id('route');
  const normalizedLocale = normalizeLocale(locale);
  const rawPoints = generateDemoPoints(seed, 200, baseStart);
  const points = resampleByDistance(rawPoints, 60);
  const meta = routeMeta(points);
  const created = {
    id: routeId,
    userId,
    locale: normalizedLocale,
    source: {
      filename,
      createdBy: 'v1-prototype',
      seed,
    },
    createdBy: 'backend-route-service',
    points,
    version: 1,
    anchorVersion: 1,
    providerHint: normalizeProvider(provider),
    crsHint: normalizeProvider(provider) === 'google' ? 'wgs84' : 'gcj02',
    startPoint: parsePoint(startPoint, { lat: points[0].lat, lng: points[0].lng }),
    endPoint: parsePoint(endPoint, null),
    bounds: routeBounds(points),
    meta,
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    targetKm: Number.isFinite(Number(targetKm)) ? Number(targetKm) : null,
    actualDistanceM: Math.round(meta.distanceM),
  };
  if (!created.startPoint) {
    created.startPoint = points[0];
  }
  if (!created.endPoint) {
    created.endPoint = points[points.length - 1];
  }
  const adjusted = normalizeRouteForProvider(created, normalizeProvider(provider));
  return upsertRouteRecord(adjusted, {
    userId,
    changeReason: 'create',
    expectedVersion: 0,
  });
}

async function adjustRouteDistance(routeId, targetKm, userId) {
  await initStorage();
  const route = await getRouteRecord(routeId, userId);
  if (!route) return null;
  const target = Number(targetKm);
  if (!Number.isFinite(target) || target <= 0) return null;
  const targetMeters = target * 1000;
  const scaled = scalePathPreserveShape(route.points, targetMeters, {
    minPoints: 30,
    maxPoints: 400,
  });
  const smoothed = angleSmooth(scaled);
  const meta = routeMeta(smoothed);
  const adjusted = {
    ...route,
    points: smoothed,
    version: Number(route.version || 0) + 1,
    adjustedDistanceKm: target,
    adjustedAt: nowIso(),
    anchorVersion: Number(route.anchorVersion || 0) + 1,
    bounds: routeBounds(smoothed),
    meta,
    updatedAt: nowIso(),
  };
  return upsertRouteRecord(adjusted, {
    userId,
    changeReason: 'adjust',
    expectedVersion: route.version,
  });
}

async function rebaseRoute(routeId, startPoint, endPoint, strategy, userId) {
  await initStorage();
  const route = await getRouteRecord(routeId, userId);
  if (!route) return null;
  const start = parsePoint(startPoint, route.startPoint);
  const end = parsePoint(endPoint, null);
  if (!start || route.points.length < 2) return route;
  const rebased = rebaseRoutePoints(route, start, end);
  const updated = {
    ...route,
    points: rebased,
    version: Number(route.version || 0) + 1,
    anchorVersion: Number(route.anchorVersion || 0) + 1,
    bounds: routeBounds(rebased),
    startPoint: start,
    endPoint: end || rebased[rebased.length - 1],
    meta: routeMeta(rebased),
    rebaseStrategy: strategy || 'manual',
    updatedAt: nowIso(),
  };
  return upsertRouteRecord(updated, {
    userId,
    changeReason: 'rebase',
    expectedVersion: route.version,
  });
}

async function startRunSession(routeId, userId, provider, idempotencyKey) {
  await initStorage();
  const route = await getRouteRecord(routeId, userId);
  if (!route) return null;
  const firstPoint = route.points[0];
  const sessionId = idempotencyKey ? `session-${idempotencyKey}` : id('session');
  const existing = await getSessionRecord(sessionId, userId);
  if (existing && existing.userId === userId) {
    return {
      session: existing,
      currentState: existing.status || SESSION_STATUS.RUNNING,
      nextAction: SESSION_NEXT_ACTION[existing.status] || 'report_location',
      resumed: true,
    };
  }

  const session = {
    id: sessionId,
    routeId,
    userId,
    provider: normalizeProvider(provider || route.providerHint),
    status: SESSION_STATUS.RUNNING,
    createdAt: nowIso(),
    startedAt: nowIso(),
    lastStateAt: nowIso(),
    cursor: 0,
    currentAccuracy: null,
    deviationScore: 0,
    pathVersion: route.version,
    locationSample: [{ lat: firstPoint.lat, lng: firstPoint.lng, accuracy: null, ts: Date.now() }],
    actualPath: [{ lat: firstPoint.lat, lng: firstPoint.lng, ts: Date.now() }],
    metadata: {
      idempotencyKey: idempotencyKey || null,
      routeVersion: route.version,
      provider: normalizeProvider(provider || route.providerHint),
    },
    version: 1,
  };
  const savedSession = await saveSessionRecord(session);
  return {
    session: savedSession,
    currentState: SESSION_STATUS.RUNNING,
    nextAction: 'report_location',
    resumed: false,
  };
}

async function appendLocation(sessionId, point, userId) {
  await initStorage();
  const normalized = normalizePoint(point || {});
  if (!normalized) {
    return {
      accepted: false,
      reason: 'invalid_point',
      pointIndex: -1,
      lagHint: null,
    };
  }
  const result = await appendSessionLocationRecord(sessionId, point, userId);
  if (!result || !result.session) {
    return null;
  }
  const session = result.session;
  const route = await getRouteRecord(session.routeId, userId);
  const state = route ? computeSessionState(session, route) : null;
  return {
    accepted: result.accepted,
    pointIndex: result.pointIndex,
    lagHint: result.lagHint || null,
    reason: result.reason || null,
    routeState: state || null,
    session,
  };
}

async function getRunSessionState(sessionId, userId) {
  await initStorage();
  const session = await getSessionRecord(sessionId, userId);
  if (!session) return null;
  const route = await getRouteRecord(session.routeId, userId);
  if (!route) return null;
  return computeSessionState(session, route);
}

async function updateRunSessionState(sessionId, userId, nextStatus) {
  await initStorage();
  const session = await getSessionRecord(sessionId, userId);
  if (!session) return null;
  if (![SESSION_STATUS.CREATED, SESSION_STATUS.RUNNING, SESSION_STATUS.PAUSED].includes(session.status)) {
    return null;
  }
  if (![SESSION_STATUS.PAUSED, SESSION_STATUS.RUNNING].includes(nextStatus)) {
    return null;
  }
  const payload = { status: nextStatus };
  if (nextStatus === SESSION_STATUS.PAUSED) {
    payload.deviationScore = session.deviationScore || 0;
  }
  const updated = await updateSessionRecord(sessionId, payload, userId);
  if (!updated) return null;
  const route = await getRouteRecord(updated.routeId, userId);
  const state = route ? computeSessionState(updated, route) : null;
  return { ...state, status: updated.status };
}

async function finishRunSession(sessionId, actualPath, userId) {
  await initStorage();
  const session = await getSessionRecord(sessionId, userId);
  if (!session) return null;
  const route = await getRouteRecord(session.routeId, userId);
  if (!route) return null;
  const incoming = Array.isArray(actualPath) ? actualPath : [];
  const safeActual = incoming
    .map(normalizePoint)
    .filter(Boolean)
    .map((point) => ({ lat: point.lat, lng: point.lng, ts: Date.now() }));
  const finalPath = safeActual.length ? safeActual : (session.actualPath || []);
  const actualDistanceM = Math.round(routePathDistanceMeters(finalPath));
  const plannedDistanceM = Math.round(route.meta?.distanceM || 0);
  const completionRate = plannedDistanceM > 0 ? Math.min(100, Math.round((actualDistanceM / plannedDistanceM) * 100)) : 0;
  const avgDeviationM = finalPath.length > 0
    ? Math.round(finalPath.reduce((sum, point) => sum + nearestDistanceToRoute(point, route.points), 0) / finalPath.length)
    : 0;
  const metrics = {
    actualDistanceM,
    plannedDistanceM,
    avgDeviationM,
    completionRate,
    pointCount: finalPath.length,
    finishCause: session.status === SESSION_STATUS.FAILED ? 'abnormal_finish' : 'normal',
    finishedAt: nowIso(),
  };
  const updated = await updateSessionRecord(sessionId, {
    status: SESSION_STATUS.FINISHED,
    metrics,
    actualPath: finalPath,
    locationSample: finalPath,
    finishedAt: nowIso(),
  }, userId);
  if (!updated) return null;
  return {
    sessionId,
    routeId: route.id,
    status: SESSION_STATUS.FINISHED,
    isTerminal: true,
    version: updated.version || 1,
    metrics,
    summary: {
      distanceM: actualDistanceM,
      plannedDistanceM,
      pointCount: finalPath.length,
      avgDeviationM,
      completionRate,
      timeSec: finalPath.length > 0 ? Math.max(1, Math.round((finalPath[finalPath.length - 1].ts - finalPath[0].ts) / 1000)) : 0,
    },
    routeState: computeSessionState(updated, route),
  };
}

async function listUserRuns(userId, query = {}) {
  await initStorage();
  const page = Number.isFinite(Number(query.page)) ? Number(query.page) : 1;
  const limit = Number.isFinite(Number(query.limit)) ? Number(query.limit) : 20;
  return listUserRoutes({
    userId,
    page,
    limit,
    status: typeof query.status === 'string' ? query.status.trim() : undefined,
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
  });
}

function getMapConfig() {
  const providers = MAP_PROVIDER_LIST.map((key) => {
    const envKey = PROVIDER_KEY_ENV[key];
    const hasApiKey = Boolean(process.env[envKey]);
    return {
      key,
      features: PROVIDER_FEATURES[key] || {},
      keyRequired: Boolean(envKey),
      hasApiKey,
    };
  });
  const version = crypto.createHash('md5')
    .update(JSON.stringify({
      providers,
      defaultProvider: DEFAULT_PROVIDER,
      localeMeta: getLocaleMeta(),
    }))
    .digest('hex');

  return {
    providers,
    defaultProvider: DEFAULT_PROVIDER,
    ...getLocaleMeta(),
    crsPolicy: {
      internal: 'wgs84',
      domesticHint: 'gcj02',
    },
    mapConfigVersion: version,
    cacheSeconds: Number(process.env.MAP_CONFIG_CACHE_SECONDS || '300'),
    updatedAt: nowIso(),
  };
}

function seedWgs84ToProvider(point, provider) {
  const providerNorm = normalizeProvider(provider);
  const converted = providerNorm === 'google' ? { lat: point.lat, lng: point.lng } : convertPoint(point, 'wgs84', 'gcj02');
  return converted || point;
}

module.exports = {
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
  normalizeLocale,
  updateRunSessionState,
  getLocaleMeta,
  splitList,
  seedWgs84ToProvider,
  toMsNumber: toPositiveNumber,
  SESSION_STATUS,
};
