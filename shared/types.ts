/**
 * TraceCraft 前后端共享类型定义
 *
 * 此文件是整个项目类型的权威来源：
 *   - 后端 import 引用此文件，确保 API 返回的数据结构有类型保障
 *   - 前端 import 引用此文件，确保请求/响应的类型安全
 *   - 后端存储层（storage）也引用此文件，共享核心数据模型
 *   - 修改任何字段时，所有引用处编译器都会自动标红
 *
 * 使用方式：
 *   后端：import type { ... } from '../../shared/types';
 *   前端：import type { ... } from '../../shared/types';
 */

// ===== 基础类型 =====

/** 地理坐标点（经纬度 + 可选时间戳） */
export interface GeoPoint {
  lat: number;
  lng: number;
  ts?: number;
}

/** 坐标系类型 */
export type CrsType = 'wgs84' | 'gcj02' | 'bd09';

/** 地图服务商 */
export type MapProvider = 'amap' | 'google' | 'baidu';

// ===== API 请求/响应类型 =====

/** 统一 API 响应格式 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  traceId?: string;
  data?: T;
  error?: string;
  code?: string;
  status?: number;
}

// ===== 路线相关类型 =====

/** 路线边界框 */
export interface RouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** 路线元数据 */
export interface RouteMeta {
  distanceM: number;
  start: GeoPoint;
  end: GeoPoint;
}

export type RouteRiskLevel = 'low' | 'medium' | 'high';

export interface RouteRiskSegment {
  type: string;
  level: RouteRiskLevel;
  message: string;
  from?: GeoPoint;
  to?: GeoPoint;
}

export interface RouteStartPointStatus {
  distanceM: number | null;
  accuracyM: number | null;
  status: 'ok' | 'far' | 'poor_accuracy' | 'unknown';
  suggestRebase: boolean;
}

/** 路线来源信息（存储层使用） */
export interface RouteSource {
  filename: string;
  createdBy: string;
  seed: number;
}

/**
 * 路线数据（前后端共享的完整路线结构）
 * - 前端作为 GeneratedRoute 的超集使用
 * - 后端作为存储和 API 响应的统一模型
 */
export interface Route {
  id: string;
  userId: string;
  locale?: string;
  source?: RouteSource;
  createdBy?: string;
  points: GeoPoint[];
  version: number;
  anchorVersion: number;
  providerHint: string;
  crsHint: string;
  startPoint: GeoPoint | null;
  endPoint: GeoPoint | null;
  bounds: RouteBounds | null;
  meta: RouteMeta;
  status: string;
  targetKm: number | null;
  actualDistanceM: number;
  adjustedDistanceKm?: number;
  adjustedAt?: string;
  rebaseStrategy?: string;
  shapeType?: string;
  riskLevel?: RouteRiskLevel;
  riskSegments?: RouteRiskSegment[];
  runnableScore?: number;
  shapeSimilarityScore?: number;
  startPointStatus?: RouteStartPointStatus;
  confirmRequired?: boolean;
  riskSummary?: string;
  isFavorite?: boolean;
  isFavorited?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 路线版本快照（存储层使用） */
export interface RouteVersion {
  id: string;
  routeId: string;
  version: number;
  snapshot: Route;
  changedBy: string | undefined;
  changeReason: string;
  createdAt: string;
}

// ===== 导航会话相关类型 =====

/** 会话状态 */
export type SessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'failed';

/** 位置上报条目 */
export interface LocationEntry extends GeoPoint {
  accuracy: number | null;
}

/** 会话元数据 */
export interface SessionMetadata {
  idempotencyKey: string | null;
  routeVersion: number;
  provider: string;
}

/** 会话统计指标 */
export interface SessionMetrics {
  actualDistanceM?: number;
  plannedDistanceM?: number;
  avgDeviationM?: number;
  completionRate?: number;
  pointCount?: number;
  finishCause?: string;
  finishedAt?: string;
  timeSec?: number;
}

/** 跑步会话数据结构（存储层 + API 层共用） */
export interface Session {
  id: string;
  routeId: string;
  userId: string;
  provider: string;
  status: string;
  createdAt: string;
  startedAt: string;
  lastStateAt: string;
  cursor: number;
  currentAccuracy: number | null;
  deviationScore: number;
  pathVersion: number;
  locationSample: LocationEntry[];
  actualPath: GeoPoint[];
  metadata: SessionMetadata;
  metrics: SessionMetrics;
  version: number;
  finishedAt?: string | null;
  pausedAt?: string | null;
  updatedAt?: string;
}

/** 会话实时状态（前端轮询获取） */
export interface SessionState {
  sessionId: string;
  routeId: string;
  status: SessionStatus;
  progressPct: number;
  lastPosition: GeoPoint | null;
  deviationM: number | null;
  needRedirect: boolean;
  currentAccuracy: number | null;
  deviationScore: number;
  pointCount: number;
  version: number;
  isTerminal: boolean;
  currentState: SessionStatus;
  nextAction: string;
  lastUpdatedAt: string;
}

/** 完成跑步返回的摘要 */
export interface FinishResult {
  sessionId: string;
  routeId: string;
  status: 'finished';
  isTerminal: true;
  version: number;
  summary: {
    distanceM: number;
    plannedDistanceM: number;
    pointCount: number;
    avgDeviationM: number;
    completionRate: number;
    timeSec: number;
  };
}

// ===== 存储层查询/操作类型 =====

/** 路线写入上下文（乐观锁 + 审计） */
export interface RouteContext {
  userId?: string;
  changeReason?: string;
  expectedVersion?: number | null;
}

/** 路线列表查询参数 */
export interface ListRunsQuery {
  userId: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

/** 路线列表返回结果 */
export interface ListRunsResult {
  total: number;
  runs: Route[];
  page: number;
  limit: number;
}

/** 位置追加结果 */
export interface AppendLocationResult {
  session: Session;
  accepted: boolean;
  reason: string | null;
  pointIndex: number;
  lagHint: string | null;
  routeState?: string;
}

/** 存储层接口：所有存储实现必须满足的契约 */
export interface IStorage {
  init(): Promise<void>;
  createRoute(route: Route, ctx?: RouteContext): Promise<Route | null>;
  getRoute(routeId: string, userId: string | null): Promise<Route | null>;
  listUserRuns(query: ListRunsQuery): Promise<ListRunsResult>;
  createSession(session: Session): Promise<Session>;
  getSession(sessionId: string, userId: string | null): Promise<Session | null>;
  saveSession(session: Session): Promise<Session>;
  appendLocation(sessionId: string, point: GeoPoint, userId: string | null): Promise<AppendLocationResult | null>;
  updateSession(sessionId: string, payload: Partial<Session>, userId: string | null): Promise<Session | null>;
  close?(): Promise<void>;
}

// ===== 地图配置 =====

/** 服务商功能特性 */
export interface ProviderFeatures {
  supportPoi: boolean;
  offlineTile: boolean;
  navHints: boolean;
  geocode?: boolean;
}

/** 地图配置响应 */
export interface MapConfig {
  providers: {
    key: MapProvider;
    features: ProviderFeatures;
    keyRequired: boolean;
    hasApiKey: boolean;
  }[];
  defaultProvider: MapProvider;
  crsPolicy: {
    internal: 'wgs84';
    domesticHint: 'gcj02';
  };
  cacheSeconds: number;
  mapConfigVersion: string;
}
