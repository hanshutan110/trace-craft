/**
 * TraceCraft 前后端共享类型定义
 *
 * 此文件是前后端 API 契约的权威来源：
 *   - 后端 import 引用此文件，确保 API 返回的数据结构有类型保障
 *   - 前端 import 引用此文件，确保请求/响应的类型安全
 *   - 修改任何接口字段时，两端编译器都会自动标红引用处
 *
 * 使用方式：
 *   后端：import type { ... } from '../../shared/types';
 *   前端：import type { ... } from '../shared/types';
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

/** 路线数据（后端返回给前端的完整路线结构） */
export interface Route {
  id: string;
  userId: string;
  points: GeoPoint[];
  version: number;
  anchorVersion: number;
  providerHint: MapProvider;
  crsHint: CrsType;
  startPoint: GeoPoint | null;
  endPoint: GeoPoint | null;
  bounds: RouteBounds | null;
  meta: RouteMeta;
  status: string;
  targetKm: number | null;
  actualDistanceM: number;
  createdAt: string;
  updatedAt: string;
}

// ===== 导航会话相关类型 =====

/** 会话状态 */
export type SessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'failed';

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
