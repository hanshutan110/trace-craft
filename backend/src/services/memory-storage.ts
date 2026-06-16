/**
 * TraceCraft 内存存储实现
 *
 * 数据存储在 memoryState 对象中，变更时写入 JSON 文件
 * 适用于开发和 MVP 阶段
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  GeoPoint,
  Route,
  RouteVersion,
  Session,
  LocationEntry,
  SessionMetadata,
  RouteContext,
  ListRunsResult,
  AppendLocationResult,
  IStorage,
} from '../../../shared/types';

// ===== 内部工具函数 =====

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

/** 标准化坐标点：验证经纬度合法性，保留 8 位小数精度 */
export function normalizePoint(point: unknown): GeoPoint | null {
  if (!point || typeof point !== 'object') return null;
  const p = point as Record<string, unknown>;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: Number(lat.toFixed(8)),
    lng: Number(lng.toFixed(8)),
  };
}

function clonePayload<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function nowTimestamp(): string {
  return nowIso();
}

// ===== 内存状态 =====

interface MemoryState {
  routes: Record<string, Route>;
  routeVersions: Record<string, RouteVersion[]>;
  sessions: Record<string, Session>;
  users: Set<string>;
  createdAt: string;
  updatedAt: string;
}

const memoryState: MemoryState = {
  routes: {},
  routeVersions: {},
  sessions: {},
  users: new Set<string>(),
  createdAt: nowTimestamp(),
  updatedAt: nowTimestamp(),
};

// JSON 数据文件路径
const DATA_FILE = process.env.TRACECRAFT_DATA_FILE || path.join(__dirname, '../../../data/state.json');

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 从 JSON 文件加载内存状态（应用启动时调用） */
export function loadMemoryState(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') return;
    if (parsed.routes && typeof parsed.routes === 'object') {
      memoryState.routes = parsed.routes;
    }
    if (parsed.routeVersions && typeof parsed.routeVersions === 'object') {
      memoryState.routeVersions = parsed.routeVersions;
    }
    if (parsed.sessions && typeof parsed.sessions === 'object') {
      memoryState.sessions = parsed.sessions;
    }
    if (Array.isArray(parsed.users)) {
      memoryState.users = new Set(parsed.users);
    }
    memoryState.createdAt = parsed.createdAt || nowTimestamp();
    memoryState.updatedAt = parsed.updatedAt || nowTimestamp();
  } catch {
    // keep current in-memory defaults
  }
}

/** 将内存状态保存到 JSON 文件（原子写入：先写临时文件再重命名） */
function saveMemoryState(): void {
  ensureDir(DATA_FILE);
  const payload = {
    ...memoryState,
    users: Array.from(memoryState.users),
    updatedAt: nowTimestamp(),
  };
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

/**
 * 从内存中查询用户路线列表
 * 支持按状态过滤、关键词搜索（文件名/routeId/形状类型）
 * 按更新时间降序排序，支持分页
 */
function listUserRoutesFromMemory(
  userId: string,
  { page = 1, limit = 20, status, search }: { page?: number; limit?: number; status?: string; search?: string }
): ListRunsResult {
  const normalizedSearch = (search || '').trim().toLowerCase();
  let routes = Object.values(memoryState.routes).filter((route) => route.userId === userId);
  if (status) {
    routes = routes.filter((route) => route.status === status);
  }
  if (normalizedSearch) {
    routes = routes.filter((route) => {
      const fileName = String(route.source?.filename || '').toLowerCase();
      const routeId = String(route.id || '').toLowerCase();
      const shape = String(route.shapeType || '').toLowerCase();
      return fileName.includes(normalizedSearch) || routeId.includes(normalizedSearch) || shape.includes(normalizedSearch);
    });
  }
  routes = routes.sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
  const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const normalizedPage = Math.max(1, Number(page) || 1);
  const start = (normalizedPage - 1) * normalizedLimit;
  return {
    total: routes.length,
    runs: routes.slice(start, start + normalizedLimit).map(clonePayload),
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

/** 提取会话快照，确保数组字段为安全类型 */
function pickSessionSnapshot(session: Session): Session {
  return {
    ...session,
    locationSample: Array.isArray(session.locationSample) ? session.locationSample : [],
    actualPath: Array.isArray(session.actualPath) ? session.actualPath : [],
    metadata: session.metadata && typeof session.metadata === 'object' ? session.metadata : { idempotencyKey: null, routeVersion: 1, provider: '' },
    metrics: session.metrics && typeof session.metrics === 'object' ? session.metrics : {},
  };
}

/**
 * 记录路线版本历史
 * 每次路线变更时保存快照，最多保留 200 条历史记录
 */
function pushRouteVersion(
  state: MemoryState,
  route: Route,
  changeBy: string | undefined,
  reason: string
): void {
  const snapshot = clonePayload(route);
  state.routeVersions[route.id] = state.routeVersions[route.id] || [];
  state.routeVersions[route.id].push({
    id: newId('rv'),
    routeId: route.id,
    version: Number(route.version || 0),
    snapshot,
    changedBy: changeBy,
    changeReason: reason || 'update',
    createdAt: nowTimestamp(),
  });
  if (state.routeVersions[route.id].length > 200) {
    state.routeVersions[route.id] = state.routeVersions[route.id].slice(-200);
  }
}

// ===== MemoryStorage 实现 =====

/**
 * 内存存储实现
 * 数据存储在 memoryState 对象中，变更时写入 JSON 文件
 * 适用于开发和 MVP 阶段
 */
export class MemoryStorage implements IStorage {
  init(): Promise<void> {
    loadMemoryState();
    return Promise.resolve();
  }

  getStore(): MemoryState {
    return memoryState;
  }

  async createRoute(route: Route, ctx: RouteContext = {}): Promise<Route> {
    const expectedVersion =
      Number.isFinite(Number(ctx.expectedVersion)) ? Number(ctx.expectedVersion) : null;
    const existing = memoryState.routes[route.id];
    if (existing) {
      if (expectedVersion !== null && Number(existing.version) !== expectedVersion) {
        throw new Error('route_version_conflict');
      }
      pushRouteVersion(memoryState, existing, ctx.userId, ctx.changeReason || 'update');
    }
    memoryState.routes[route.id] = {
      ...route,
      updatedAt: route.updatedAt || nowTimestamp(),
      version: Number.isFinite(Number(route.version))
        ? Number(route.version)
        : Number(existing ? existing.version || 1 : 1),
      userId: route.userId || existing?.userId,
    };
    if (!memoryState.users.has(memoryState.routes[route.id].userId)) {
      memoryState.users.add(memoryState.routes[route.id].userId);
    }
    if (!existing) {
      memoryState.routeVersions[route.id] = [
        {
          id: newId('rv'),
          routeId: route.id,
          version: memoryState.routes[route.id].version,
          snapshot: clonePayload(memoryState.routes[route.id]),
          changedBy: ctx.userId,
          changeReason: ctx.changeReason || 'create',
          createdAt: nowTimestamp(),
        },
      ];
    }
    saveMemoryState();
    return clonePayload(memoryState.routes[route.id]);
  }

  async getRoute(routeId: string, userId: string | null): Promise<Route | null> {
    const route = memoryState.routes[routeId];
    if (!route) return null;
    if (userId && route.userId !== userId) return null;
    return clonePayload(route);
  }

  async listUserRuns(query: { userId: string; page?: number; limit?: number; status?: string; search?: string }): Promise<ListRunsResult> {
    return listUserRoutesFromMemory(query.userId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    });
  }

  async createSession(session: Session): Promise<Session> {
    const idem = session?.metadata?.idempotencyKey;
    if (session.id && memoryState.sessions[session.id]) {
      return clonePayload(memoryState.sessions[session.id]);
    }
    if (idem) {
      const existed = Object.values(memoryState.sessions).find(
        (item) => item.userId === session.userId && item.metadata?.idempotencyKey === idem
      );
      if (existed) {
        return clonePayload(existed);
      }
    }
    memoryState.sessions[session.id] = pickSessionSnapshot({
      ...session,
      metadata: { ...(session.metadata || { idempotencyKey: null, routeVersion: 1, provider: '' }), idempotencyKey: idem || null },
      version: Number.isFinite(Number(session.version)) ? Number(session.version) : 1,
      updatedAt: nowTimestamp(),
      createdAt: session.createdAt || nowTimestamp(),
    });
    saveMemoryState();
    return clonePayload(memoryState.sessions[session.id]);
  }

  async getSession(sessionId: string, userId: string | null): Promise<Session | null> {
    const session = memoryState.sessions[sessionId];
    if (!session) return null;
    if (userId && session.userId !== userId) return null;
    return clonePayload(pickSessionSnapshot(session));
  }

  async saveSession(session: Session): Promise<Session> {
    memoryState.sessions[session.id] = {
      ...pickSessionSnapshot(session),
      updatedAt: nowTimestamp(),
      version: Number.isFinite(Number(session.version))
        ? Number(session.version)
        : (memoryState.sessions[session.id]?.version || 0) + 1,
    };
    saveMemoryState();
    return clonePayload(memoryState.sessions[session.id]);
  }

  async appendLocation(
    sessionId: string,
    point: GeoPoint,
    userId: string | null
  ): Promise<AppendLocationResult | null> {
    const session = memoryState.sessions[sessionId];
    if (!session) {
      return null;
    }
    if (userId && session.userId !== userId) {
      return {
        session: clonePayload(session),
        accepted: false,
        reason: 'forbidden',
        pointIndex: -1,
        lagHint: null,
      };
    }
    const pointNorm = normalizePoint(point);
    if (!pointNorm) {
      return {
        session: clonePayload(session),
        accepted: false,
        reason: 'invalid_point',
        pointIndex: Array.isArray(session.actualPath) ? session.actualPath.length : 0,
        lagHint: null,
      };
    }
    const allowed = ['created', 'running'];
    if (!allowed.includes(session.status)) {
      return {
        session: clonePayload(session),
        accepted: false,
        reason: session.status === 'paused' ? 'session_paused' : 'session_not_active',
        pointIndex: Array.isArray(session.locationSample) ? session.locationSample.length : 0,
        lagHint: session.status === 'paused' ? 'paused' : 'not_running',
      };
    }
    const accuracy = Number.isFinite((point as unknown as Record<string, unknown>).accuracy as number)
      ? ((point as unknown as Record<string, unknown>).accuracy as number)
      : null;
    const ts = Date.now();
    const locationEntry: LocationEntry = { lat: pointNorm.lat, lng: pointNorm.lng, accuracy, ts };
    const actualEntry: GeoPoint = { lat: pointNorm.lat, lng: pointNorm.lng, ts };
    session.locationSample = Array.isArray(session.locationSample)
      ? [...session.locationSample, locationEntry]
      : [locationEntry];
    session.actualPath = Array.isArray(session.actualPath)
      ? [...session.actualPath, actualEntry]
      : [actualEntry];
    session.cursor = session.locationSample.length;
    session.currentAccuracy = accuracy;
    session.version = (session.version || 1) + 1;
    session.status = 'running';
    session.lastStateAt = nowTimestamp();
    session.updatedAt = nowTimestamp();
    memoryState.sessions[sessionId] = pickSessionSnapshot(session);
    saveMemoryState();
    return {
      session: clonePayload(session),
      accepted: true,
      reason: null,
      pointIndex: session.locationSample.length - 1,
      lagHint: null,
    };
  }

  async updateSession(
    sessionId: string,
    payload: Partial<Session>,
    userId: string | null
  ): Promise<Session | null> {
    const session = memoryState.sessions[sessionId];
    if (!session) {
      return null;
    }
    if (userId && session.userId !== userId) {
      return null;
    }
    memoryState.sessions[sessionId] = {
      ...pickSessionSnapshot(session),
      ...payload,
      version: (session.version || 1) + 1,
      updatedAt: nowTimestamp(),
      lastStateAt: nowTimestamp(),
    };
    if (Array.isArray(payload.actualPath)) {
      memoryState.sessions[sessionId].actualPath = payload.actualPath.map((item) => clonePayload(item));
    }
    if (Array.isArray(payload.locationSample)) {
      memoryState.sessions[sessionId].locationSample = payload.locationSample.map((item) => clonePayload(item));
    }
    saveMemoryState();
    return clonePayload(memoryState.sessions[sessionId]);
  }
}

/** 获取内存存储的全局状态快照（供调试/管理接口使用） */
export function getMemoryStore(): {
  routes: Record<string, Route>;
  sessions: Record<string, Session>;
  users: string[];
  createdAt: string;
  updatedAt: string;
} {
  return {
    routes: memoryState.routes,
    sessions: memoryState.sessions,
    users: Array.from(memoryState.users),
    createdAt: memoryState.createdAt,
    updatedAt: memoryState.updatedAt,
  };
}

/** 获取内存中所有用户路线 ID 列表 */
export function listMemoryUserRunIds(): string[] {
  return Object.keys(memoryState.routes || {});
}

/** 批量标准化坐标点 */
export function normalizePoints(points: unknown[]): GeoPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .map(normalizePoint)
    .filter((p): p is GeoPoint => p !== null)
    .map((p) => ({ lat: p.lat, lng: p.lng, ts: Date.now() }));
}
