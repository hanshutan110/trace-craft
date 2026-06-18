/**
 * TraceCraft 路线服务模块（TypeScript 版）
 *
 * 核心职责：
 *   1. 路线生成（从图片或模板生成路线）
 *   2. 路线调整（缩放距离、重映射起终点）
 *   3. 导航会话管理（创建、上报位置、暂停/恢复、完成）
 *   4. 地图配置（服务商、语言、坐标系统）
 *
 * 所有坐标内部统一使用 WGS84，输出时按 provider 动态转换为 GCJ-02/BD-09
 */

import crypto from 'crypto';
import sharp from 'sharp';
import { pointDistanceMeters, scalePathPreserveShape, latLngCentroid, resampleByDistance, angleSmooth } from '../utils/geo';
import type { GeoPoint } from '../utils/geo';
import { convertPoint } from '../utils/coordAdapter';
import type { CrsType } from '../utils/coordAdapter';
import { newId } from '../utils/id';
import {
  normalizePoint,
  upsertRouteRecord,
  getRouteRecord,
  createSessionRecord,
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
  RouteRiskSegment,
  RouteStartPointStatus,
  Session,
  SessionMetrics,
  ListRunsQuery,
  ListRunsResult,
  AppendLocationResult,
} from './storage';

// 地图配置从独立模块导入
import { normalizeProvider, normalizeLocale } from './map-config';

// ===== 常量与配置 =====

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

const RISK_LEVEL_WEIGHT: Record<'low' | 'medium' | 'high', number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const TEMPLATE_TARGET_KM: Record<string, number> = {
  circle: 3.5,
  triangle: 3,
  square: 4,
  star: 5,
  heart: 4.2,
  hexagon: 4.8,
};
const MIN_TARGET_KM = 1;
const MAX_TARGET_KM = 50;

// ===== 工具函数 =====

function nowIso(): string {
  return new Date().toISOString();
}

function parsePoint(raw: unknown, fallback: GeoPoint | null = null): GeoPoint | null {
  const point = normalizePoint(raw || {});
  if (point) return point;
  return fallback;
}

function normalizeTargetKm(value: unknown, fallback: number): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  if (normalized < MIN_TARGET_KM || normalized > MAX_TARGET_KM) throw new Error('invalid_target_distance');
  return normalized;
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

function alignFirstPointToStart(points: GeoPoint[], start: GeoPoint | null): GeoPoint[] {
  if (!start || points.length === 0) return points;
  const first = points[0];
  const shift = {
    lat: start.lat - first.lat,
    lng: start.lng - first.lng,
  };
  return points.map((point) => ({
    ...point,
    lat: point.lat + shift.lat,
    lng: point.lng + shift.lng,
  }));
}

async function extractImageContourUnitPoints(buffer: Buffer): Promise<Array<{ x: number; y: number }>> {
  const image = await sharp(buffer, { limitInputPixels: 16_000_000 })
    .rotate()
    .resize({ width: 96, height: 96, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = image.info;
  const data = image.data;
  const luminance = new Float32Array(width * height);
  const alpha = new Uint8Array(width * height);
  let sum = 0;
  let visible = 0;
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * channels;
    const a = data[offset + 3] ?? 255;
    const l = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    luminance[i] = l;
    alpha[i] = a;
    if (a > 20) {
      sum += l;
      visible += 1;
    }
  }
  if (visible < 12) {
    throw new Error('image_has_no_visible_contour');
  }
  const avg = sum / visible;
  const edgePixels: Array<{ x: number; y: number }> = [];
  const isForeground = (index: number): boolean => alpha[index] > 20 && luminance[index] < avg + 12;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      if (alpha[idx] <= 20) continue;
      const contrast = Math.max(
        Math.abs(luminance[idx] - luminance[idx - 1]),
        Math.abs(luminance[idx] - luminance[idx + 1]),
        Math.abs(luminance[idx] - luminance[idx - width]),
        Math.abs(luminance[idx] - luminance[idx + width])
      );
      const boundary =
        isForeground(idx) &&
        (!isForeground(idx - 1) || !isForeground(idx + 1) || !isForeground(idx - width) || !isForeground(idx + width));
      if (contrast > 24 || boundary) {
        edgePixels.push({ x, y });
      }
    }
  }
  if (edgePixels.length < 16) {
    throw new Error('image_contour_too_weak');
  }

  const centroid = edgePixels.reduce(
    (acc, point) => ({ x: acc.x + point.x / edgePixels.length, y: acc.y + point.y / edgePixels.length }),
    { x: 0, y: 0 }
  );
  const bins = 144;
  const sampled = Array.from({ length: bins }, () => ({ x: 0, y: 0, radius: -1 }));
  edgePixels.forEach((point) => {
    const nx = (point.x - centroid.x) / Math.max(1, width);
    const ny = (point.y - centroid.y) / Math.max(1, height);
    const angle = Math.atan2(ny, nx);
    const bin = Math.max(0, Math.min(bins - 1, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * bins)));
    const radius = Math.hypot(nx, ny);
    if (radius > sampled[bin].radius) {
      sampled[bin] = { x: nx, y: ny, radius };
    }
  });
  const contour = sampled
    .filter((point) => point.radius > 0)
    .map((point) => ({ x: point.x, y: point.y }));
  if (contour.length < 12) {
    throw new Error('image_contour_too_sparse');
  }
  contour.push(contour[0]);
  return contour;
}

async function generateImageContourPoints(buffer: Buffer, center: GeoPoint, targetKm: number | null | undefined): Promise<GeoPoint[]> {
  const unit = await extractImageContourUnitPoints(buffer);
  const perimeterUnit = unit.reduce((sum, point, index) => {
    if (index === 0) return 0;
    const prev = unit[index - 1];
    return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
  }, 0);
  const targetMeters = Math.max(1000, (Number.isFinite(Number(targetKm)) && Number(targetKm) > 0 ? Number(targetKm) : 5) * 1000);
  const scaleM = targetMeters / Math.max(0.001, perimeterUnit);
  const raw = unit.map((point, index) => ({
    ...metersToPoint(center, point.x * scaleM, point.y * scaleM),
    ts: Date.now() + index * 1000,
  }));
  return resampleByDistance(angleSmooth(raw), 60);
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

function normalizeLocationForRoute(point: GeoPoint, route: Route): GeoPoint {
  const crs = route.crsHint as CrsType;
  if (crs === 'gcj02' || crs === 'bd09') {
    const converted = convertPoint(point, 'wgs84', crs);
    return converted ? { ...point, lat: converted.lat, lng: converted.lng } : point;
  }
  return point;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function routeRiskSummary(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high') return '路线存在高风险路段，请调整起点或重新生成后再导航';
  if (level === 'medium') return '路线需要用户确认，建议先预览并调整起点';
  return '路线风险较低，可预览确认后开始导航';
}

function mergeRiskLevel(segments: RouteRiskSegment[]): 'low' | 'medium' | 'high' {
  return segments.reduce<'low' | 'medium' | 'high'>((level, segment) => {
    return RISK_LEVEL_WEIGHT[segment.level] > RISK_LEVEL_WEIGHT[level] ? segment.level : level;
  }, 'low');
}

function buildStartPointStatus(route: Route, currentPoint: GeoPoint | null, accuracyM: number | null): RouteStartPointStatus {
  if (!currentPoint || !route.meta?.start) {
    return {
      distanceM: null,
      accuracyM,
      status: accuracyM !== null && accuracyM > 50 ? 'poor_accuracy' : 'unknown',
      suggestRebase: true,
    };
  }

  const distanceM = Math.round(pointDistanceMeters(currentPoint, route.meta.start));
  const poorAccuracy = accuracyM !== null && accuracyM > 50;
  return {
    distanceM,
    accuracyM,
    status: poorAccuracy ? 'poor_accuracy' : distanceM > 100 ? 'far' : 'ok',
    suggestRebase: poorAccuracy || distanceM > 100,
  };
}

function addLocalRiskSegments(route: Route, currentPoint: GeoPoint | null, accuracyM: number | null): RouteRiskSegment[] {
  const segments: RouteRiskSegment[] = [];
  const startStatus = buildStartPointStatus(route, currentPoint, accuracyM);
  if (startStatus.status === 'poor_accuracy') {
    segments.push({
      type: 'gps_accuracy',
      level: 'medium',
      message: '当前定位精度较低，建议重试定位或手动选择起点',
    });
  }
  if (startStatus.status === 'far') {
    segments.push({
      type: 'start_point_far',
      level: 'medium',
      message: `当前位置距离路线起点约 ${startStatus.distanceM} 米，建议调整起点`,
      from: currentPoint || undefined,
      to: route.meta.start,
    });
  }

  const targetMeters = Number(route.targetKm || route.adjustedDistanceKm || 0) * 1000;
  const distanceM = Number(route.meta?.distanceM || 0);
  if (targetMeters > 0 && distanceM > 0) {
    const diffRatio = Math.abs(distanceM - targetMeters) / targetMeters;
    if (diffRatio > 0.25) {
      segments.push({
        type: 'distance_deviation',
        level: 'medium',
        message: '生成路线与目标距离偏差较大，建议调整目标距离或重新生成',
      });
    }
  }

  for (let i = 1; i < route.points.length; i += 1) {
    const segmentDistance = pointDistanceMeters(route.points[i - 1], route.points[i]);
    if (segmentDistance > 600) {
      segments.push({
        type: 'long_segment',
        level: 'medium',
        message: '路线存在过长直连片段，可能穿越不可通行区域',
        from: route.points[i - 1],
        to: route.points[i],
      });
      break;
    }
  }

  return segments;
}

function toLngLat(point: GeoPoint): string {
  return `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
}

function sampleAmapWalkingSegments(points: GeoPoint[]): Array<{ from: GeoPoint; to: GeoPoint }> {
  if (points.length < 8) return [];
  const pairs: Array<{ from: GeoPoint; to: GeoPoint }> = [];
  const indexes = [0.12, 0.38, 0.64].map((ratio) => Math.floor(points.length * ratio));
  const step = Math.max(2, Math.floor(points.length / 12));
  indexes.forEach((index) => {
    const from = points[index];
    const to = points[Math.min(points.length - 1, index + step)];
    if (from && to && pointDistanceMeters(from, to) > 80) {
      pairs.push({ from, to });
    }
  });
  return pairs;
}

async function getAmapWalkingDistance(from: GeoPoint, to: GeoPoint): Promise<number | null> {
  const key = process.env.AMAP_KEY;
  if (!key) return null;
  const url = new URL('https://restapi.amap.com/v3/direction/walking');
  url.searchParams.set('key', key);
  url.searchParams.set('origin', toLngLat(from));
  url.searchParams.set('destination', toLngLat(to));
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      status?: string;
      route?: { paths?: Array<{ distance?: string }> };
    };
    if (payload.status !== '1') return null;
    const distance = Number(payload.route?.paths?.[0]?.distance);
    return Number.isFinite(distance) ? distance : null;
  } catch {
    return null;
  }
}

async function assessAmapWalkability(route: Route): Promise<RouteRiskSegment[]> {
  if (process.env.TRACECRAFT_ALLOW_UNVERIFIED_ROUTES === '1') return [];
  if (normalizeProvider(route.providerHint) !== 'amap') {
    return [{
      type: 'walkability_unverified',
      level: 'high',
      message: '当前地图服务暂未接入道路可跑性校验，请切换可验证服务或重新生成',
    }];
  }
  if (!process.env.AMAP_KEY) {
    return [{
      type: 'amap_key_missing',
      level: 'high',
      message: '缺少高德步行规划 Key，无法确认路线是否可跑',
    }];
  }
  const segments: RouteRiskSegment[] = [];
  const samples = sampleAmapWalkingSegments(route.points);
  let checked = 0;
  for (const sample of samples) {
    const directDistance = pointDistanceMeters(sample.from, sample.to);
    const walkingDistance = await getAmapWalkingDistance(sample.from, sample.to);
    if (walkingDistance === null) continue;
    checked += 1;
    const detourRatio = walkingDistance / Math.max(1, directDistance);
    if (detourRatio > 4 && walkingDistance - directDistance > 500) {
      segments.push({
        type: 'amap_walk_detour',
        level: 'high',
        message: '高德步行规划显示该片段绕行明显，疑似不可直达',
        from: sample.from,
        to: sample.to,
      });
    } else if (detourRatio > 2.5 && walkingDistance - directDistance > 250) {
      segments.push({
        type: 'amap_walk_detour',
        level: 'medium',
        message: '高德步行规划显示该片段需要较大绕行，建议预览确认',
        from: sample.from,
        to: sample.to,
      });
    }
  }
  if (samples.length > 0 && checked === 0) {
    segments.push({
      type: 'amap_walk_unavailable',
      level: 'high',
      message: '暂未获取到高德步行规划结果，无法确认路线是否可跑',
    });
  }
  return segments;
}

async function enrichRouteRisk(
  route: Route,
  options: { currentPoint?: GeoPoint | null; currentAccuracy?: number | null } = {}
): Promise<Route> {
  const currentPoint = options.currentPoint || route.startPoint || route.meta.start || null;
  const currentAccuracy =
    options.currentAccuracy !== undefined && Number.isFinite(Number(options.currentAccuracy))
      ? Number(options.currentAccuracy)
      : null;
  const localSegments = addLocalRiskSegments(route, currentPoint, currentAccuracy);
  const amapSegments = await assessAmapWalkability(route);
  const riskSegments = [...localSegments, ...amapSegments];
  const riskLevel = mergeRiskLevel(riskSegments);
  const startPointStatus = buildStartPointStatus(route, currentPoint, currentAccuracy);
  const runnableScore = clamp(95 - riskSegments.reduce((sum, item) => sum + (item.level === 'high' ? 35 : item.level === 'medium' ? 18 : 6), 0), 0, 100);
  const shapeSimilarityScore = route.source?.createdBy === 'template' ? 92 : 78;
  return {
    ...route,
    riskLevel,
    riskSegments,
    startPointStatus,
    runnableScore,
    shapeSimilarityScore,
    confirmRequired: riskLevel !== 'low' || startPointStatus.status !== 'ok',
    riskSummary: routeRiskSummary(riskLevel),
  };
}

function metersToPoint(origin: GeoPoint, eastM: number, northM: number): GeoPoint {
  const lat = origin.lat + northM / 111320;
  const lng = origin.lng + eastM / (111320 * Math.cos((origin.lat * Math.PI) / 180));
  return { lat, lng };
}

function buildTemplateUnitPoints(shapeType: string): Array<{ x: number; y: number }> {
  if (shapeType === 'circle') {
    return Array.from({ length: 80 }, (_, index) => {
      const a = (Math.PI * 2 * index) / 80;
      return { x: Math.cos(a), y: Math.sin(a) };
    });
  }
  if (shapeType === 'triangle') {
    return [{ x: 0, y: -1 }, { x: 0.9, y: 0.8 }, { x: -0.9, y: 0.8 }, { x: 0, y: -1 }];
  }
  if (shapeType === 'square') {
    return [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }];
  }
  if (shapeType === 'heart') {
    return Array.from({ length: 120 }, (_, index) => {
      const t = (Math.PI * 2 * index) / 120;
      const x = (16 * Math.sin(t) ** 3) / 18;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18;
      return { x, y };
    });
  }
  const outer = 1;
  const inner = 0.42;
  return Array.from({ length: 11 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (Math.PI * index) / 5;
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  });
}

function generateTemplatePoints(shapeType: string, center: GeoPoint, targetKm: number): GeoPoint[] {
  const unit = buildTemplateUnitPoints(shapeType);
  const perimeterUnit = unit.reduce((sum, point, index) => {
    if (index === 0) return 0;
    const prev = unit[index - 1];
    return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
  }, 0);
  const targetMeters = Math.max(1000, targetKm * 1000);
  const scaleM = targetMeters / Math.max(1, perimeterUnit);
  const raw = unit.map((point, index) => ({
    ...metersToPoint(center, point.x * scaleM, -point.y * scaleM),
    ts: Date.now() + index * 1000,
  }));
  return resampleByDistance(angleSmooth(raw), 60);
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
  currentAccuracy?: number | null;
}

export interface CreateTemplateRouteParams {
  userId: string | null;
  shapeType: string;
  provider?: string | null;
  locale?: string | null;
  targetKm?: number | null;
  startPoint?: unknown;
  currentAccuracy?: number | null;
}

/** 核心接口：从上传图片提取轮廓并生成路线 */
export async function createRouteFromImage(params: CreateRouteParams): Promise<Route> {
  const { userId, filename, buffer, provider, locale, targetKm, startPoint, endPoint, currentAccuracy } = params;
  await initStorage();
  const seed = randomSeedFromString(filename + (buffer ? buffer.length : 0));
  const baseStart = normalizePoint(startPoint);
  if (!baseStart) throw new Error('start_point_required');
  const target = normalizeTargetKm(targetKm, 5);
  const routeId = newId('route');
  const normalizedLocale = normalizeLocale(locale);
  if (!buffer || buffer.length === 0) {
    throw new Error('image_buffer_empty');
  }
  const points = alignFirstPointToStart(await generateImageContourPoints(buffer, baseStart, target), baseStart);
  const meta = routeMeta(points);
  const created: Route = {
    id: routeId,
    userId: userId || '',
    locale: normalizedLocale,
    source: {
      filename,
      createdBy: 'image-contour',
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
    targetKm: target,
    actualDistanceM: Math.round(meta.distanceM),
  };
  if (!created.startPoint) {
    created.startPoint = points[0];
  }
  if (!created.endPoint) {
    created.endPoint = points[points.length - 1];
  }
  const adjusted = normalizeRouteForProvider(created, normalizeProvider(provider));
  const withRisk = await enrichRouteRisk(adjusted, {
    currentPoint: adjusted.startPoint,
    currentAccuracy,
  });
  return upsertRouteRecord(withRisk, {
    userId: userId || undefined,
    changeReason: 'create',
    expectedVersion: 0,
  });
}

/** 根据基础图形模板生成路线 */
export async function createRouteFromTemplate(params: CreateTemplateRouteParams): Promise<Route> {
  const { userId, shapeType, provider, locale, targetKm, startPoint, currentAccuracy } = params;
  await initStorage();
  const normalizedShape = String(shapeType || 'star').trim() || 'star';
  const target = normalizeTargetKm(targetKm, TEMPLATE_TARGET_KM[normalizedShape] || 5);
  const routeId = newId('route');
  const normalizedLocale = normalizeLocale(locale);
  const baseStart = normalizePoint(startPoint);
  if (!baseStart) throw new Error('start_point_required');
  const rawPoints = alignFirstPointToStart(generateTemplatePoints(normalizedShape, baseStart, target), baseStart);
  const meta = routeMeta(rawPoints);
  const created: Route = {
    id: routeId,
    userId: userId || '',
    locale: normalizedLocale,
    source: {
      filename: `${normalizedShape}-template`,
      createdBy: 'template',
      seed: randomSeedFromString(normalizedShape),
    },
    createdBy: 'backend-template-service',
    points: rawPoints,
    version: 1,
    anchorVersion: 1,
    providerHint: normalizeProvider(provider),
    crsHint: normalizeProvider(provider) === 'google' ? 'wgs84' : 'gcj02',
    startPoint: baseStart,
    endPoint: rawPoints[rawPoints.length - 1],
    bounds: routeBounds(rawPoints),
    meta,
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    targetKm: target,
    actualDistanceM: Math.round(meta.distanceM),
    shapeType: normalizedShape,
  };
  const adjusted = normalizeRouteForProvider(created, normalizeProvider(provider));
  const withRisk = await enrichRouteRisk(adjusted, {
    currentPoint: adjusted.startPoint,
    currentAccuracy,
  });
  return upsertRouteRecord(withRisk, {
    userId: userId || undefined,
    changeReason: 'create-template',
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
  if (!Number.isFinite(target) || target < MIN_TARGET_KM || target > MAX_TARGET_KM) return null;
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
  const withRisk = await enrichRouteRisk(adjusted, {
    currentPoint: adjusted.startPoint,
    currentAccuracy: adjusted.startPointStatus?.accuracyM ?? null,
  });
  return upsertRouteRecord(withRisk, {
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
  const withRisk = await enrichRouteRisk(updated, {
    currentPoint: start,
    currentAccuracy: updated.startPointStatus?.accuracyM ?? null,
  });
  return upsertRouteRecord(withRisk, {
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
  idempotencyKey: string | undefined,
  riskConfirmed: boolean = false
): Promise<StartSessionResult | null> {
  await initStorage();
  const route = await getRouteRecord(routeId, userId);
  if (!route) return null;
  if (route.riskLevel === 'high') {
    throw new Error('route_high_risk');
  }
  if (route.confirmRequired && !riskConfirmed) {
    throw new Error('route_risk_confirmation_required');
  }
  const firstPoint = route.points[0];
  const sessionId = idempotencyKey ? `session-${idempotencyKey}` : newId('session');
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
  const savedSession = await createSessionRecord(session);
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
  const existingSession = await getSessionRecord(sessionId, userId);
  if (!existingSession) {
    return null;
  }
  const route = await getRouteRecord(existingSession.routeId, userId);
  if (!route) {
    return null;
  }
  const routePoint = normalizeLocationForRoute(point, route);
  const result: AppendLocationResult | null = await appendSessionLocationRecord(sessionId, routePoint, userId);
  if (!result || !result.session) {
    return null;
  }
  const session = result.session;
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

