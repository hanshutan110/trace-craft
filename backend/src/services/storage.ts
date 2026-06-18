/**
 * TraceCraft 存储层模块（TypeScript 版）
 *
 * 统一存储入口，当前仅支持 PostgreSQL：
 *   - postgres：PostgreSQL 数据库
 *
 * 所有对外 API 均从此文件导出，内部实现由 postgres-storage.ts 提供
 */

import type {
  GeoPoint,
  Route,
  Session,
  RouteContext,
  ListRunsQuery,
  ListRunsResult,
  AppendLocationResult,
  IStorage,
} from '../../../shared/types';

// 重新导出所有类型，保持向后兼容
export type {
  GeoPoint,
  Route,
  RouteRiskSegment,
  RouteStartPointStatus,
  RouteBounds,
  RouteMeta,
  Session,
  LocationEntry,
  SessionMetadata,
  SessionMetrics,
  RouteContext,
  RouteVersion,
  ListRunsQuery,
  ListRunsResult,
  AppendLocationResult,
} from '../../../shared/types';

import { PostgresStorage, getConnectionString } from './postgres-storage';
import { normalizePoint } from './geo-utils';

// ===== 存储实例管理 =====

let storage: IStorage | null = null;
let initPromise: Promise<IStorage> | null = null;

const configuredMode = (process.env.TRACECRAFT_STORAGE || '').toLowerCase();

/**
 * 创建存储实例（单例模式）
 * 仅使用 PostgreSQL，配置错误时直接失败，避免写入旧文件态存储。
 */
async function createStorage(): Promise<IStorage> {
  if (storage) return storage;
  if (configuredMode && configuredMode !== 'postgres') {
    throw new Error(`unsupported_storage_mode:${configuredMode}`);
  }
  if (!getConnectionString()) {
    throw new Error('postgres_connection_string_missing');
  }
  const pgStorage = new PostgresStorage();
  await pgStorage.init();
  storage = pgStorage;
  return storage;
}

/** 初始化存储层（仅执行一次，后续调用等待同一个 Promise） */
export async function initStorage(): Promise<void> {
  if (!initPromise) {
    initPromise = createStorage();
  }
  await initPromise;
}

async function getStorage(): Promise<IStorage> {
  await initStorage();
  return storage!;
}

/** 当前存储模式 */
export function storageMode(): string {
  return 'postgres';
}

// ===== 对外暴露的存储操作函数 =====

/** 创建或更新路线记录（内部按 ID 幂等判断，首次创建时自动插入） */
export const upsertRouteRecord = async (route: Route, ctx: RouteContext): Promise<Route> => {
  const repo = await getStorage();
  const result = await repo.createRoute(route, ctx);
  if (!result) throw new Error('route_upsert_denied');
  return result;
};

/** 查询路线记录（按 ID 查询，可选用户权限校验） */
export const getRouteRecord = async (routeId: string, userId: string | null): Promise<Route | null> => {
  const repo = await getStorage();
  return repo.getRoute(routeId, userId);
};

/** 创建会话记录（幂等：重复插入时返回已有记录） */
export const createSessionRecord = async (session: Session): Promise<Session> => {
  const repo = await getStorage();
  return repo.createSession(session);
};

/** 查询会话记录（按 ID 查询，可选用户权限校验） */
export const getSessionRecord = async (sessionId: string, userId: string | null): Promise<Session | null> => {
  const repo = await getStorage();
  return repo.getSession(sessionId, userId);
};

/** 更新会话记录（部分更新，返回更新后的完整会话） */
export const updateSessionRecord = async (
  sessionId: string,
  payload: Partial<Session>,
  userId: string | null
): Promise<Session | null> => {
  const repo = await getStorage();
  return repo.updateSession(sessionId, payload, userId);
};

/** 追加上报位置点到会话轨迹（写入 run_location_events + 更新环形缓冲） */
export const appendSessionLocationRecord = async (
  sessionId: string,
  point: GeoPoint,
  userId: string | null
): Promise<AppendLocationResult | null> => {
  const repo = await getStorage();
  return repo.appendLocation(sessionId, point, userId);
};

/** 分页查询用户跑步会话列表 */
export const listUserRuns = async (query: ListRunsQuery): Promise<ListRunsResult> => {
  const repo = await getStorage();
  return repo.listUserRuns(query);
};

export { normalizePoint };
