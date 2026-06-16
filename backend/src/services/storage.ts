/**
 * TraceCraft 存储层模块（TypeScript 版）
 *
 * 统一存储入口，根据环境变量选择 MemoryStorage 或 PostgresStorage：
 *   - memory：内存 + JSON 文件持久化（默认，MVP 阶段使用）
 *   - postgres / postgres-auto：PostgreSQL 数据库（生产环境推荐）
 *
 * 通过环境变量 TRACECRAFT_STORAGE 控制切换
 * 所有对外 API 均从此文件导出，内部实现已拆分到 memory-storage.ts 和 postgres-storage.ts
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

// 从子模块导入实现
import { MemoryStorage, loadMemoryState, normalizePoint, normalizePoints, getMemoryStore, listMemoryUserRunIds } from './memory-storage';
import { PostgresStorage, getConnectionString } from './postgres-storage';

// ===== 存储实例管理 =====

let storage: IStorage | null = null;
let initPromise: Promise<IStorage> | null = null;
let usePostgres = false;

const configuredMode = (process.env.TRACECRAFT_STORAGE || '').toLowerCase();

/** 检测是否应使用 PostgreSQL */
async function detectPostgres(): Promise<boolean> {
  const connectionString = getConnectionString();
  if (configuredMode === 'memory') return false;
  if (configuredMode === 'postgres') return Boolean(connectionString);
  if (configuredMode === 'postgres-auto') return Boolean(connectionString);
  return Boolean(connectionString);
}

/**
 * 创建存储实例（单例模式）
 * 优先尝试 PostgreSQL，失败时回退到内存模式
 */
async function createStorage(): Promise<IStorage> {
  if (storage) return storage;
  const shouldUsePg = await detectPostgres();
  if (!shouldUsePg) {
    storage = new MemoryStorage();
    await storage.init();
    usePostgres = false;
    return storage;
  }
  try {
    const pgStorage = new PostgresStorage();
    await pgStorage.init();
    storage = pgStorage;
    usePostgres = true;
    return storage;
  } catch {
    storage = new MemoryStorage();
    await storage.init();
    usePostgres = false;
    return storage;
  }
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
  return usePostgres ? 'postgres' : 'memory';
}

// ===== 对外暴露的存储操作函数 =====

export const createRouteRecord = async (route: Route, ctx: RouteContext): Promise<Route> => {
  const repo = await getStorage();
  return repo.createRoute(route, ctx);
};

export const upsertRouteRecord = async (route: Route, ctx: RouteContext): Promise<Route> => {
  const repo = await getStorage();
  return repo.createRoute(route, ctx);
};

export const getRouteRecord = async (routeId: string, userId: string | null): Promise<Route | null> => {
  const repo = await getStorage();
  return repo.getRoute(routeId, userId);
};

export const saveSessionRecord = async (session: Session): Promise<Session> => {
  const repo = await getStorage();
  return repo.createSession(session);
};

export const getSessionRecord = async (sessionId: string, userId: string | null): Promise<Session | null> => {
  const repo = await getStorage();
  return repo.getSession(sessionId, userId);
};

export const updateSessionRecord = async (
  sessionId: string,
  payload: Partial<Session>,
  userId: string | null
): Promise<Session | null> => {
  const repo = await getStorage();
  return repo.updateSession(sessionId, payload, userId);
};

export const appendSessionLocationRecord = async (
  sessionId: string,
  point: GeoPoint,
  userId: string | null
): Promise<AppendLocationResult | null> => {
  const repo = await getStorage();
  return repo.appendLocation(sessionId, point, userId);
};

export const listUserRuns = async (query: ListRunsQuery): Promise<ListRunsResult> => {
  const repo = await getStorage();
  return repo.listUserRuns(query);
};

export function getStore(): {
  routes: Record<string, Route>;
  sessions: Record<string, Session>;
  users: string[];
  createdAt: string;
  updatedAt: string;
} {
  if (!storage && configuredMode === 'memory') {
    loadMemoryState();
  }
  return getMemoryStore();
}

export function listUserRunIds(): string[] {
  return listMemoryUserRunIds();
}

export { normalizePoint, normalizePoints };
