const crypto = require('crypto');
const { pointDistanceMeters, scalePathPreserveShape, latLngCentroid, resampleByDistance, angleSmooth } = require('../utils/geo');
const { convertPoint, wgs84ToGcj02 } = require('../utils/coordAdapter');
const {
  getRoute,
  getSession,
  putRoute,
  putSession,
  getStore,
  normalizePoint,
} = require('./storage');

const DEFAULT_PROVIDER = process.env.MAP_PROVIDER_DEFAULT || 'amap';
const MAP_PROVIDER_LIST = (process.env.MAP_PROVIDER_LIST || 'amap,google,baidu,tencent')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

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

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function randomSeedFromString(value) {
  const h = crypto.createHash('md5').update(value).digest('hex');
  const base = parseInt(h.substring(0, 8), 16);
  return base / 0xffffffff;
}

function normalizeProvider(value) {
  if (!value) return DEFAULT_PROVIDER;
  if (MAP_PROVIDER_LIST.includes(value)) return value;
  return DEFAULT_PROVIDER;
}

function parsePoint(raw, fallback) {
  const p = normalizePoint(raw || {});
  if (p) return p;
  return fallback || null;
}

function routeBounds(points) {
  if (!points.length) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  points.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
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

function generateDemoPoints(seed, count, center) {
  const origin = center || { lat: 31.2304, lng: 121.4737 };
  const radius = 0.004 + seed * 0.0015;
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const wobble = (seed - 0.5) * 0.3;
    const r = radius * (0.6 + 0.4 * Math.sin(angle * 3 + wobble * 10));
    pts.push({
      lat: origin.lat + Math.cos(angle) * r,
      lng: origin.lng + Math.sin(angle) * r,
      ts: Date.now() + i * 1000,
    });
  }
  return pts;
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
    points: route.points.map((p) => {
      const converted = toProvider(p);
      return {
        ...p,
        lat: converted.lat,
        lng: converted.lng,
      };
    }),
  };
}

function rebaseRoutePoints(route, startPoint, endPoint) {
  const points = route.points.map((p) => ({ lat: p.lat, lng: p.lng }));
  const origin = route.meta.start;
  const targetStart = startPoint || origin;
  const shift = {
    lat: targetStart.lat - origin.lat,
    lng: targetStart.lng - origin.lng,
  };
  let rebased = points.map((p) => ({ lat: p.lat + shift.lat, lng: p.lng + shift.lng }));
  if (endPoint) {
    const shiftedEnd = rebased[rebased.length - 1];
    const endShift = {
      lat: endPoint.lat - shiftedEnd.lat,
      lng: endPoint.lng - shiftedEnd.lng,
    };
    rebased = rebased.map((p) => ({
      lat: p.lat + endShift.lat,
      lng: p.lng + endShift.lng,
    }));
  }
  const smoothed = angleSmooth(rebased);
  return smoothed;
}

function createRouteFromImage({ userId, filename, buffer, startPoint, endPoint, provider, targetKm, locale }) {
  const seed = randomSeedFromString(filename + (buffer ? buffer.length : 0));
  const baseStart = normalizePoint(startPoint) || parsePoint(startPoint, { lat: 31.2304, lng: 121.4737 });
  const routeId = id('route');
  const rawPoints = generateDemoPoints(seed, 200, baseStart);
  const points = resampleByDistance(rawPoints, 60);
  const meta = routeMeta(points);
  const created = {
    id: routeId,
    userId,
    locale: locale || 'auto',
    source: {
      filename,
      createdBy: 'v1-prototype',
      seed,
    },
    createdBy: 'backend-route-service',
    points,
    version: 1,
    meta,
    bounds: routeBounds(points),
    anchorVersion: 1,
    providerHint: normalizeProvider(provider),
    crsHint: normalizeProvider(provider) === 'google' ? 'wgs84' : 'gcj02',
    startPoint: parsePoint(startPoint, { lat: points[0].lat, lng: points[0].lng }),
    endPoint: parsePoint(endPoint, null),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetKm: Number.isFinite(Number(targetKm)) ? Number(targetKm) : null,
    actualDistanceM: meta.distanceM,
  };
  if (!created.startPoint) {
    created.startPoint = points[0];
  }
  if (!created.endPoint) {
    created.endPoint = points[points.length - 1];
  }
  const adjusted = normalizeRouteForProvider(created, normalizeProvider(provider));
  putRoute(adjusted);
  return adjusted;
}

function adjustRouteDistance(routeId, targetKm) {
  const route = getRoute(routeId);
  if (!route || !Number.isFinite(targetKm) || targetKm <= 0) {
    return null;
  }
  const targetMeters = targetKm * 1000;
  const scaled = scalePathPreserveShape(route.points, targetMeters, {
    minPoints: 30,
    maxPoints: 400,
  });
  const smoothed = angleSmooth(scaled);
  const meta = routeMeta(smoothed);
  const adjusted = {
    ...route,
    points: smoothed,
    version: route.version + 1,
    adjustedDistanceKm: targetKm,
    adjustedAt: new Date().toISOString(),
    anchorVersion: route.anchorVersion + 1,
    originAnchor: route.startPoint,
    pointsVersion: route.version + 1,
    bounds: routeBounds(smoothed),
    meta,
    updatedAt: new Date().toISOString(),
  };
  putRoute(adjusted);
  return adjusted;
}

function rebaseRoute(routeId, startPoint, endPoint, strategy) {
  const route = getRoute(routeId);
  if (!route) return null;
  const start = parsePoint(startPoint, route.startPoint);
  const end = parsePoint(endPoint, null);
  if (!start || route.points.length < 2) return route;
  const rebased = rebaseRoutePoints(route, start, end);
  const updated = {
    ...route,
    points: rebased,
    version: route.version + 1,
    anchorVersion: route.anchorVersion + 1,
    bounds: routeBounds(rebased),
    startPoint: start,
    endPoint: end || rebased[rebased.length - 1],
    meta: routeMeta(rebased),
    rebaseStrategy: strategy || 'manual',
    updatedAt: new Date().toISOString(),
  };
  putRoute(updated);
  return updated;
}

function startRunSession(routeId, userId, provider) {
  const route = getRoute(routeId);
  if (!route) return null;
  const sessionId = id('session');
  const firstPoint = route.points[0];
  const session = {
    id: sessionId,
    routeId,
    userId,
    provider: normalizeProvider(provider || route.providerHint),
    status: 'running',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    cursor: 0,
    currentAccuracy: null,
    deviationScore: 0,
    locationSample: [{ lat: firstPoint.lat, lng: firstPoint.lng, accuracy: null, ts: Date.now() }],
    actualPath: [{ lat: firstPoint.lat, lng: firstPoint.lng, ts: Date.now() }],
    pathVersion: route.version,
  };
  putSession(session);
  return session;
}

function appendLocation(sessionId, point) {
  const session = getSession(sessionId);
  if (!session) return null;
  const next = normalizePoint(point);
  if (!next) return session;
  session.locationSample.push({
    lat: next.lat,
    lng: next.lng,
    accuracy: Number.isFinite(point.accuracy) ? point.accuracy : null,
    ts: Date.now(),
  });
  session.currentAccuracy = Number.isFinite(point.accuracy) ? point.accuracy : session.currentAccuracy;
  session.actualPath = session.actualPath || [];
  const currentLength = session.actualPath.length;
  if (currentLength === 0 || pointDistanceMeters(session.actualPath[currentLength - 1], next) > 0.2) {
    session.actualPath.push(next);
  }
  putSession(session);
  return session;
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

function getRunSessionState(sessionId) {
  const session = getSession(sessionId);
  if (!session) return null;
  const route = getRoute(session.routeId);
  if (!route) return null;
  const last = session.locationSample[session.locationSample.length - 1];
  const nearest = last ? nearestDistanceToRoute(last, route.points) : Number.POSITIVE_INFINITY;
  const threshold = 25;
  const progressPct = Math.min(100, Math.round((session.actualPath.length / Math.max(1, route.points.length)) * 100));
  session.deviationScore = Number.isFinite(nearest) ? Math.round(nearest * 10) / 10 : session.deviationScore;
  session.lastStateAt = new Date().toISOString();
  session.locationState = {
    deviationM: Number.isFinite(nearest) ? Math.round(nearest) : null,
    needRedirect: nearest > threshold,
  };
  putSession(session);
  return {
    sessionId: session.id,
    routeId: route.id,
    status: session.status,
    progressPct,
    lastPosition: last || route.points[0],
    deviationM: session.locationState.deviationM,
    needRedirect: session.locationState.needRedirect,
    currentAccuracy: session.currentAccuracy,
    deviationScore: session.deviationScore,
    updatedAt: session.lastStateAt,
  };
}

function finishRunSession(sessionId, actualPath) {
  const session = getSession(sessionId);
  if (!session) return null;
  const route = getRoute(session.routeId);
  if (!route) return null;
  const incoming = Array.isArray(actualPath) ? actualPath : [];
  const safeActual = incoming
    .map(normalizePoint)
    .filter(Boolean)
    .map((p) => ({ lat: p.lat, lng: p.lng, ts: Date.now() }));
  const path = safeActual.length ? safeActual : session.actualPath;

  let totalActual = 0;
  for (let i = 1; i < path.length; i += 1) {
    totalActual += pointDistanceMeters(path[i - 1], path[i]);
  }
  let deviationSum = 0;
  path.forEach((p) => {
    deviationSum += nearestDistanceToRoute(p, route.points);
  });
  const avgDeviation = path.length > 0 ? deviationSum / path.length : 0;

  const completionRate = totalActual > 0 ? Math.min(100, Math.round((totalActual / route.meta.distanceM) * 100)) : 0;
  session.status = 'finished';
  session.actualPath = path;
  session.finishedAt = new Date().toISOString();
  session.metrics = {
    actualDistanceM: Math.round(totalActual),
    plannedDistanceM: Math.round(route.meta.distanceM),
    avgDeviationM: Math.round(avgDeviation),
    completionRate,
    pointCount: path.length,
  };
  putSession(session);
  return session;
}

function listUserRuns(userId) {
  const ids = (getStore().userRuns || {})[userId] || [];
  return ids.map((routeId) => getRoute(routeId)).filter(Boolean);
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

  return {
    providers,
    defaultProvider: DEFAULT_PROVIDER,
    localeFallback: 'auto',
    crsPolicy: {
      internal: 'wgs84',
      domesticHint: 'gcj02',
    },
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
  seedWgs84ToProvider,
};
