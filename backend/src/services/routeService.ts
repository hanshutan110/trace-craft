/**
 * TraceCraft 路线服务模块（TypeScript 版）
 *
 * 核心职责：
 *   1. 路线生成（从图片生成 Demo 路线）
 *   2. 路线调整（缩放距离、重映射起终点）
 *   3. 导航会话管理（创建、上报位置、暂停/恢复、完成）
 *   4. 地图配置（服务商、语言、坐标系统）
 *
 * 所有坐标内部统一使用 WGS84，输出时按 provider 动态转换为 GCJ-02/BD-09
 */

import crypto from 'crypto';
import { pointDistanceMeters, scalePathPreserveShape, latLngCentroid, resampleByDistance, angleSmooth } from '../utils/geo';
import type { GeoPoint } from '../utils/geo';
import { convertPoint } from '../utils/coordAdapter';
import type { CrsType } from '../utils/coordAdapter';
import {
  normalizePoint,
  createRouteRecord,
  upsertRouteRecord,
  getRouteRecord,
  saveSessionRecord,
  getSessionRecord,
  appendSessionLocationRecord,
  updateSessionRecord,
  listUserRuns as listUserRoutes,
  initStorage,
} from './storage';
import type {
  Route,
  RouteMeta,
  RouteBounds,
  RouteContext,
  Session,
  SessionMetrics,
  ListRunsQuery,
  ListRunsResult,
  AppendLocationResult,
} from './storage';

// 从 geo 模块重新导出 GeoPoint，供 index.ts 使用
export type { GeoPoint } from '../utils/geo';

// ===== 常量与配置 =====

/** 默认地图服务商，未指定时使用高德 */
const DEFAULT_PROVIDER: string = process.env.MAP_PROVIDER_DEFAULT || 'amap';
/** 支持的地图服务商列表 */
const MAP_PROVIDER_LIST: string[] = (process.env.MAP_PROVIDER_LIST || 'amap,google,baidu')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const DEFAULT_LOCALE: string = process.env.MAP_LOCALE_FALLBACK || 'zh-CN';

const LOCALE_LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
};

/** 导航会话状态枚举 */
export const SESSION_STATUS = {
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
  FAILED: 'failed',
} as const;

export type SessionStatusType = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

/** 各状态对应的下一步动作提示 */
const SESSION_NEXT_ACTION: Record<string, string> = {
  [SESSION_STATUS.CREATED]: 'start_run',
  [SESSION_STATUS.RUNNING]: 'report_location',
  [SESSION_STATUS.PAUSED]: 'resume_or_review',
  [SESSION_STATUS.FINISHED]: 'summary',
  [SESSION_STATUS.FAILED]: 'retry_or_rebase',
};

/** 服务商功能特性 */
interface ProviderFeatures {
  supportPoi: boolean;
  offlineTile: boolean;
  navHints: boolean;
  geocode?: boolean;
}

// 各服务商支持的功能特性
const PROVIDER_FEATURES: Record<string, ProviderFeatures> = {
  amap: { supportPoi: true, offlineTile: false, navHints: true, geocode: true },
  google: { supportPoi: true, offlineTile: false, navHints: true, geocode: true },
  baidu: { supportPoi: true, offlineTile: false, navHints: true },
};

// 服务商 API Key 对应的环境变量名
const PROVIDER_KEY_ENV: Record<string, string> = {
  amap: 'AMAP_KEY',
  google: 'GOOGLE_MAPS_KEY',
  baidu: 'BAIDU_MAP_KEY',
};

// ===== 工具函数 =====

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function splitList(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const SUPPORTED_LOCALES: string[] = (() => {
  const locales = splitList(process.env.MAP_LOCALES || 'zh-CN,en-US');
  const uniq = [...new Set(locales)];
  return uniq.length ? uniq : ['zh-CN', 'en-US'];
})();

function withLocaleFallback(fallback: string): string {
  return SUPPORTED_LOCALES.includes(fallback) ? fallback : (SUPPORTED_LOCALES[0] || 'zh-CN');
}

/** 标准化地图服务商名称，不在列表中时回退到默认值 */
export function normalizeProvider(value: string | undefined | null): string {
  if (!value) return DEFAULT_PROVIDER;
  if (MAP_PROVIDER_LIST.includes(value)) return value;
  return DEFAULT_PROVIDER;
}

/** 标准化语言代码，不在支持列表中时回退到默认语言 */
export function normalizeLocale(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return DEFAULT_LOCALE;
  const normalized = value.trim();
  if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  return withLocaleFallback(DEFAULT_LOCALE);
}

function parseLocaleLabels(value: string): Record<string, string> {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function parsePoint(raw: unknown, fallback: GeoPoint | null = null): GeoPoint | null {
  const point = normalizePoint(raw || {});
  if (point) return point;
  return fallback;
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

// ===== 路线计算函数 =====

/** 计算路线的经纬度边界框 */
function routeBounds(points: GeoPoint[]): RouteBounds | null {
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

/** 计算路线总距离（米） */
function routeDistance(points: GeoPoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    sum += pointDistanceMeters(points[i - 1], points[i]);
  }
  return sum;
}

/** 提取路线元数据：总距离、起点、终点 */
function routeMeta(points: GeoPoint[]): RouteMeta {
  const distanceM = routeDistance(points);
  const start = points[0];
  const end = points[points.length - 1];
  return { distanceM, start, end };
}

/** 计算路径总距离（米），用于实际跑步轨迹 */
function routePathDistanceMeters(path: GeoPoint[]): number {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < path.length; i += 1) {
    sum += pointDistanceMeters(path[i - 1], path[i]);
  }
  return sum;
}

/**
 * 根据 seed 生成 Demo 路线点集
 * 以中心点为基准，使用极坐标绘制不规则闭合曲线
 * 默认中心点为上海（31.2304, 121.4737）
 */
function generateDemoPoints(seed: number, count: number, center?: GeoPoint | null): GeoPoint[] {
  const origin = center || { lat: 31.2304, lng: 121.4737 };
  const radius = 0.004 + seed * 0.0015;
  const points: GeoPoint[] = [];
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

/** 根据文件名生成确定性随机种子 */
function randomSeedFromString(value: string): number {
  const h = crypto.createHash('md5').update(String(value)).digest('hex');
  const base = parseInt(h.substring(0, 8), 16);
  return base / 0xffffffff;
}

/**
 * 按服务商要求转换路线坐标
 * 内部统一 WGS84，Google 保持原样，国内服务商转换为 GCJ-02/BD-09
 */
function normalizeRouteForProvider(route: Route, provider: string): Route {
  const providerNorm = normalizeProvider(provider);
  const crsHint: CrsType = providerNorm === 'google' ? 'wgs84' : 'gcj02';
  const toProvider = (point: GeoPoint): GeoPoint => {
    if (providerNorm === 'google') {
      return point;
    }
    if (providerNorm === 'baidu') {
      return convertPoint(point, 'wgs84', 'bd09') || point;
    }
    return convertPoint(point, 'wgs84', 'gcj02') || point;
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

/**
 * 路线重映射：平移路线使起点对齐到新位置
 * 若指定终点，则同时进行终点对齐（整体偏移）
 * 最后使用 angleSmooth 平滑处理
 */
function rebaseRoutePoints(route: Route, startPoint: GeoPoint | null, endPoint: GeoPoint | null): GeoPoint[] {
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

/** 计算给定点到路线最近线段的最小距离（米） */
function nearestDistanceToRoute(point: GeoPoint, routePoints: GeoPoint[]): number {
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

/** 导航会话实时状态 */
export interface SessionState {
  sessionId: string;
  routeId: string;
  status: string;
  progressPct: number;
  lastPosition: GeoPoint | null;
  deviationM: number | null;
  needRedirect: boolean;
  currentAccuracy: number | null;
  deviationScore: number;
  pointCount: number;
  version: number;
  isTerminal: boolean;
  currentState: string;
  nextAction: string;
  lastUpdatedAt: string;
}

/**
 * 计算导航会话实时状态
 * 包含：进度百分比、当前位置、偏离距离、是否需要重新导航等
 */
function computeSessionState(session: Session, route: Route): SessionState | null {
  if (!session || !route) return null;
  const actualPath: GeoPoint[] = Array.isArray(session.actualPath) ? session.actualPath : [];
  const status = session.status || SESSION_STATUS.CREATED;
  const plannedDistance = Number(route?.meta?.distanceM || 0);
  const traveledDistance = routePathDistanceMeters(actualPath);
  const latestPoint = actualPath.length
    ? actualPath[actualPath.length - 1]
    : route.points[0] || null;
  const deviation = latestPoint
    ? nearestDistanceToRoute(latestPoint, route.points)
    : Number.POSITIVE_INFINITY;
  const progressPct =
    plannedDistance > 0
      ? Math.min(100, Math.max(0, Math.round((traveledDistance / plannedDistance) * 100)))
      : 0;
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
    isTerminal: [SESSION_STATUS.FINISHED as string, SESSION_STATUS.FAILED as string].includes(status),
    currentState: status,
    nextAction: SESSION_NEXT_ACTION[status] || 'report_location',
    lastUpdatedAt: session.lastStateAt || nowIso(),
  };
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

// ===== 核心接口 =====

/** 创建路线请求参数 */
export interface CreateRouteParams {
  userId: string | null;
  filename: string;
  buffer: Buffer;
  provider?: string | null;
  locale?: string | null;
  targetKm?: number | null;
  startPoint?: unknown;
  endPoint?: unknown;
}

/**
 * 核心接口：从上传图片生成路线
 * 当前为 V1 原型，使用种子生成 Demo 路线，未来替换为 AI 图像识别
 */
export async function createRouteFromImage(params: CreateRouteParams): Promise<Route> {
  const { userId, filename, buffer, provider, locale, targetKm, startPoint, endPoint } = params;
  await initStorage();
  const seed = randomSeedFromString(filename + (buffer ? buffer.length : 0));
  const baseStart = normalizePoint(startPoint) || parsePoint(startPoint, { lat: 31.2304, lng: 121.4737 });
  const routeId = id('route');
  const normalizedLocale = normalizeLocale(locale);
  const rawPoints = generateDemoPoints(seed, 200, baseStart);
  const points = resampleByDistance(rawPoints, 60);
  const meta = routeMeta(points);
  const created: Route = {
    id: routeId,
    userId: userId || '',
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
    userId: userId || undefined,
    changeReason: 'create',
    expectedVersion: 0,
  });
}

/**
 * 调整路线距离
 * 按目标公里数缩放路线形状，保持路线整体形状不变
 */
export async function adjustRouteDistance(
  routeId: string,
  targetKm: number,
  userId: string | null
): Promise<Route | null> {
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
  const adjusted: Route = {
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
    userId: userId || undefined,
    changeReason: 'adjust',
    expectedVersion: route.version,
  });
}

/**
 * 重映射路线起终点
 * 将已有路线平移到用户指定的新起点/终点位置
 */
export async function rebaseRoute(
  routeId: string,
  startPoint: GeoPoint | null,
  endPoint: GeoPoint | null,
  strategy: string | undefined,
  userId: string | null
): Promise<Route | null> {
  await initStorage();
  const route = await getRouteRecord(routeId, userId);
  if (!route) return null;
  const start = parsePoint(startPoint, route.startPoint);
  const end = parsePoint(endPoint, null);
  if (!start || route.points.length < 2) return route;
  const rebased = rebaseRoutePoints(route, start, end);
  const updated: Route = {
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
    userId: userId || undefined,
    changeReason: 'rebase',
    expectedVersion: route.version,
  });
}

/** 开始跑步会话返回结果 */
interface StartSessionResult {
  session: Session;
  currentState: string;
  nextAction: string;
  resumed: boolean;
}

/**
 * 开始跑步会话
 * 支持幂等性：若提供 idempotencyKey 且对应会话已存在，则直接返回已有会话
 */
export async function startRunSession(
  routeId: string,
  userId: string | null,
  provider: string | null | undefined,
  idempotencyKey: string | undefined
): Promise<StartSessionResult | null> {
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

  const session: Session = {
    id: sessionId,
    routeId,
    userId: userId || '',
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
    metrics: {},
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

/** 上报位置结果 */
interface AppendLocationResultExtended {
  accepted: boolean;
  pointIndex: number;
  lagHint: string | null;
  reason: string | null;
  routeState: SessionState | null;
  session: Session;
}

/**
 * 上报实时位置点
 * 验证坐标合法性，追加到会话轨迹中
 */
export async function appendLocation(
  sessionId: string,
  point: GeoPoint,
  userId: string | null
): Promise<AppendLocationResultExtended | null> {
  await initStorage();
  const normalized = normalizePoint(point || {});
  if (!normalized) {
    return {
      accepted: false,
      reason: 'invalid_point',
      pointIndex: -1,
      lagHint: null,
      routeState: null,
      session: null!,
    };
  }
  const result: AppendLocationResult | null = await appendSessionLocationRecord(sessionId, point, userId);
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

/** 获取跑步会话实时状态 */
export async function getRunSessionState(
  sessionId: string,
  userId: string | null
): Promise<SessionState | null> {
  await initStorage();
  const session = await getSessionRecord(sessionId, userId);
  if (!session) return null;
  const route = await getRouteRecord(session.routeId, userId);
  if (!route) return null;
  return computeSessionState(session, route);
}

/** 更新跑步会话状态（暂停/恢复） */
export async function updateRunSessionState(
  sessionId: string,
  userId: string | null,
  nextStatus: string
): Promise<(SessionState & { status: string }) | null> {
  await initStorage();
  const session = await getSessionRecord(sessionId, userId);
  if (!session) return null;
  const activeStatuses: string[] = [SESSION_STATUS.CREATED, SESSION_STATUS.RUNNING, SESSION_STATUS.PAUSED];
  const allowedNextStatuses: string[] = [SESSION_STATUS.PAUSED, SESSION_STATUS.RUNNING];
  if (!activeStatuses.includes(session.status)) {
    return null;
  }
  if (!allowedNextStatuses.includes(nextStatus)) {
    return null;
  }
  const payload: Partial<Session> = { status: nextStatus };
  if (nextStatus === SESSION_STATUS.PAUSED) {
    payload.deviationScore = session.deviationScore || 0;
  }
  const updated = await updateSessionRecord(sessionId, payload, userId);
  if (!updated) return null;
  const route = await getRouteRecord(updated.routeId, userId);
  const state = route ? computeSessionState(updated, route) : null;
  return state ? { ...state, status: updated.status } : null;
}

/** 完成跑步返回结果 */
interface FinishResult {
  sessionId: string;
  routeId: string;
  status: string;
  isTerminal: boolean;
  version: number;
  metrics: SessionMetrics;
  summary: {
    distanceM: number;
    plannedDistanceM: number;
    pointCount: number;
    avgDeviationM: number;
    completionRate: number;
    timeSec: number;
  };
  routeState: SessionState | null;
}

/**
 * 结束跑步会话
 * 计算完成率、平均偏离距离等统计指标
 */
export async function finishRunSession(
  sessionId: string,
  actualPath: GeoPoint[],
  userId: string | null
): Promise<FinishResult | null> {
  await initStorage();
  const session = await getSessionRecord(sessionId, userId);
  if (!session) return null;
  const route = await getRouteRecord(session.routeId, userId);
  if (!route) return null;
  const incoming = Array.isArray(actualPath) ? actualPath : [];
  const safeActual = incoming
    .map((p) => normalizePoint(p))
    .filter((p): p is GeoPoint => p !== null)
    .map((p) => ({ lat: p.lat, lng: p.lng, ts: Date.now() }));
  const finalPath = safeActual.length ? safeActual : (session.actualPath || []);
  const actualDistanceM = Math.round(routePathDistanceMeters(finalPath));
  const plannedDistanceM = Math.round(route.meta?.distanceM || 0);
  const completionRate =
    plannedDistanceM > 0 ? Math.min(100, Math.round((actualDistanceM / plannedDistanceM) * 100)) : 0;
  const avgDeviationM =
    finalPath.length > 0
      ? Math.round(
          finalPath.reduce((sum, p) => sum + nearestDistanceToRoute(p, route.points), 0) / finalPath.length
        )
      : 0;
  const metrics: SessionMetrics = {
    actualDistanceM,
    plannedDistanceM,
    avgDeviationM,
    completionRate,
    pointCount: finalPath.length,
    finishCause: session.status === SESSION_STATUS.FAILED ? 'abnormal_finish' : 'normal',
    finishedAt: nowIso(),
  };
  const updated = await updateSessionRecord(
    sessionId,
    {
      status: SESSION_STATUS.FINISHED,
      metrics,
      actualPath: finalPath,
      locationSample: finalPath as Session['locationSample'],
      finishedAt: nowIso(),
    },
    userId
  );
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
      timeSec:
        finalPath.length > 0
          ? Math.max(1, Math.round((finalPath[finalPath.length - 1].ts! - finalPath[0].ts!) / 1000))
          : 0,
    },
    routeState: computeSessionState(updated, route),
  };
}

/** 查询用户路线列表，支持分页、状态过滤和关键词搜索 */
export async function listUserRuns(
  userId: string | null,
  query: Omit<ListRunsQuery, 'userId'> = {}
): Promise<ListRunsResult> {
  await initStorage();
  const page = Number.isFinite(Number(query.page)) ? Number(query.page) : 1;
  const limit = Number.isFinite(Number(query.limit)) ? Number(query.limit) : 20;
  return listUserRoutes({
    userId: userId || '',
    page,
    limit,
    status: typeof query.status === 'string' ? query.status.trim() : undefined,
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
  });
}

/**
 * 获取地图配置信息
 * 返回：服务商列表及特性、默认服务商、语言配置、坐标策略、缓存版本号
 */
export function getMapConfig() {
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
  const version = crypto
    .createHash('md5')
    .update(
      JSON.stringify({
        providers,
        defaultProvider: DEFAULT_PROVIDER,
        localeMeta: getLocaleMeta(),
      })
    )
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

/** 将 WGS84 坐标按服务商转换为对应坐标系 */
export function seedWgs84ToProvider(point: GeoPoint, provider: string | undefined): GeoPoint {
  const providerNorm = normalizeProvider(provider);
  const converted =
    providerNorm === 'google'
      ? { lat: point.lat, lng: point.lng }
      : convertPoint(point, 'wgs84', 'gcj02');
  return converted || point;
}

export function toMsNumber(value: unknown, fallback: number): number {
  return toPositiveNumber(value, fallback);
}

export { getLocaleMeta, splitList };
