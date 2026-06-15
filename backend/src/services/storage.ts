/**
 * TraceCraft 存储层模块（TypeScript 版）
 *
 * 支持两种存储模式：
 *   1. MemoryStorage —— 内存 + JSON 文件持久化（默认，MVP 阶段使用）
 *   2. PostgresStorage —— PostgreSQL 数据库（生产环境推荐）
 *
 * 通过环境变量 TRACECRAFT_STORAGE 控制切换：
 *   - memory：强制内存模式
 *   - postgres / postgres-auto：尝试连接 PostgreSQL，失败回退到内存模式
 *
 * IStorage 接口定义了统一的存储契约，所有实现必须满足
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { GeoPoint } from '../utils/geo';

// ===== 类型定义 =====

/** 路线数据结构 */
export interface Route {
  id: string;
  userId: string;
  locale: string;
  source: {
    filename: string;
    createdBy: string;
    seed: number;
  };
  createdBy: string;
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
  createdAt: string;
  updatedAt: string;
  targetKm: number | null;
  actualDistanceM: number;
  adjustedDistanceKm?: number;
  adjustedAt?: string;
  rebaseStrategy?: string;
  shapeType?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  riskSegments?: RouteRiskSegment[];
  runnableScore?: number;
  shapeSimilarityScore?: number;
  startPointStatus?: RouteStartPointStatus;
  confirmRequired?: boolean;
  riskSummary?: string;
  [key: string]: unknown;
}

/** 路线风险片段 */
export interface RouteRiskSegment {
  type: string;
  level: 'low' | 'medium' | 'high';
  message: string;
  from?: GeoPoint;
  to?: GeoPoint;
}

/** 起点适配状态 */
export interface RouteStartPointStatus {
  distanceM: number | null;
  accuracyM: number | null;
  status: 'ok' | 'far' | 'poor_accuracy' | 'unknown';
  suggestRebase: boolean;
}

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

/** 路线版本快照 */
export interface RouteVersion {
  id: string;
  routeId: string;
  version: number;
  snapshot: Route;
  changedBy: string | undefined;
  changeReason: string;
  createdAt: string;
}

/** 跑步会话数据结构 */
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

/** 位置上报条目 */
export interface LocationEntry extends GeoPoint {
  accuracy: number | null;
}

/** 会话元数据 */
export interface SessionMetadata {
  idempotencyKey: string | null;
  routeVersion: number;
  provider: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

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
}

// ===== IStorage 接口：所有存储实现必须满足的契约 =====

export interface IStorage {
  init(): Promise<void>;
  createRoute(route: Route, ctx?: RouteContext): Promise<Route>;
  getRoute(routeId: string, userId: string | null): Promise<Route | null>;
  listUserRuns(query: ListRunsQuery): Promise<ListRunsResult>;
  createSession(session: Session): Promise<Session>;
  getSession(sessionId: string, userId: string | null): Promise<Session | null>;
  saveSession(session: Session): Promise<Session>;
  appendLocation(sessionId: string, point: GeoPoint, userId: string | null): Promise<AppendLocationResult | null>;
  updateSession(sessionId: string, payload: Partial<Session>, userId: string | null): Promise<Session | null>;
  close?(): Promise<void>;
}

// ===== 通用工具函数 =====

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

function toJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
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

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 从 JSON 文件加载内存状态（应用启动时调用） */
function loadMemoryState(): void {
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

function toPgTimestamp(value: unknown): Date | null {
  if (!value) return null;
  return new Date(value as string | Date);
}

// ===== MemoryStorage 实现 =====

/**
 * 内存存储实现
 * 数据存储在 memoryState 对象中，变更时写入 JSON 文件
 * 适用于开发和 MVP 阶段
 */
class MemoryStorage implements IStorage {
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

  async listUserRuns(query: ListRunsQuery): Promise<ListRunsResult> {
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

// ===== PostgresStorage 实现 =====

/** 数据库行类型（snake_case） */
interface SessionDbRow {
  id: string;
  route_id: string;
  user_id: string;
  status: string;
  provider: string | null;
  cursor: number;
  current_accuracy: number | null;
  deviation_score: number;
  path_version: number;
  started_at: Date | null;
  finished_at: Date | null;
  paused_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_state_at: Date | null;
  metadata: Record<string, unknown>;
  location_sample: LocationEntry[];
  actual_path: GeoPoint[];
  metrics: SessionMetrics;
  version: number;
}

/** 尝试加载 pg 模块，未安装时返回 null */
// eslint-disable-next-line @typescript-eslint/no-require-imports
function getPg(): typeof import('pg') | null {
  try {
    return require('pg');
  } catch {
    return null;
  }
}

/**
 * PostgreSQL 存储实现
 * 使用连接池管理数据库连接，支持事务操作
 * 表结构：users、routes、route_versions、run_sessions、run_location_events、run_audit_logs
 */
class PostgresStorage implements IStorage {
  async init(): Promise<void> {
    if (pgPool) return;
    const pg = getPg();
    if (!pg || !connectionString) {
      throw new Error('postgres_not_configured');
    }
    pgPool = new pg.Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || '8'),
      idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS || '30000'),
    });
    await this.ensureSchema();
    await this.ensureIndexes();
  }

  private async query(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const result = await pgPool!.query(sql, params);
    return result.rows || [];
  }

  private async ensureSchema(): Promise<void> {
    const statements = [
      `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        anchor_version INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payload JSONB NOT NULL
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS route_versions (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        version INT NOT NULL,
        snapshot JSONB NOT NULL,
        changed_by TEXT,
        change_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(route_id, version)
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS run_sessions (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        provider TEXT,
        cursor INT NOT NULL DEFAULT 0,
        current_accuracy DOUBLE PRECISION,
        deviation_score DOUBLE PRECISION DEFAULT 0,
        path_version INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        paused_at TIMESTAMPTZ,
        idempotency_key TEXT,
        last_state_at TIMESTAMPTZ,
        location_sample JSONB NOT NULL DEFAULT '[]'::jsonb,
        actual_path JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        metrics JSONB DEFAULT '{}'::jsonb,
        version INT NOT NULL DEFAULT 1
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS run_location_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES run_sessions(id) ON DELETE CASCADE,
        seq INT NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        ts TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(session_id, seq)
      )
      `,
      `
      CREATE TABLE IF NOT EXISTS run_audit_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES run_sessions(id) ON DELETE SET NULL,
        route_id TEXT,
        user_id TEXT,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `,
    ];
    for (const sql of statements) {
      await pgPool!.query(sql);
    }
  }

  private async ensureIndexes(): Promise<void> {
    const sqls = [
      `CREATE INDEX IF NOT EXISTS idx_routes_user_created ON routes(user_id, updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_updated ON run_sessions(user_id, updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_status ON run_sessions(status)`,
      `CREATE INDEX IF NOT EXISTS idx_events_session_seq ON run_location_events(session_id, seq)`,
      `CREATE INDEX IF NOT EXISTS idx_route_versions_route_id_version ON route_versions(route_id, version)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_user_idempotency ON run_sessions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`,
      `ALTER TABLE routes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
      `ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`,
      `ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS idempotency_key TEXT`,
    ];
    for (const sql of sqls) {
      await pgPool!.query(sql);
    }
  }

  private async ensureUser(userId: string): Promise<void> {
    await pgPool!.query(
      `
      INSERT INTO users (id)
      VALUES ($1)
      ON CONFLICT (id) DO NOTHING
      `,
      [userId]
    );
  }

  /** 将数据库行映射为前端使用的 camelCase 会话对象 */
  private mapSessionDbRow(row: SessionDbRow): Session {
    return {
      id: row.id,
      routeId: row.route_id,
      userId: row.user_id,
      status: row.status,
      provider: row.provider || '',
      cursor: row.cursor,
      currentAccuracy: row.current_accuracy,
      deviationScore: row.deviation_score,
      pathVersion: row.path_version,
      startedAt: toPgTimestamp(row.started_at) ? row.started_at!.toISOString() : '',
      finishedAt: toPgTimestamp(row.finished_at) ? row.finished_at!.toISOString() : null,
      pausedAt: toPgTimestamp(row.paused_at) ? row.paused_at!.toISOString() : null,
      createdAt: toPgTimestamp(row.created_at) ? row.created_at.toISOString() : nowTimestamp(),
      updatedAt: toPgTimestamp(row.updated_at) ? row.updated_at.toISOString() : nowTimestamp(),
      lastStateAt: toPgTimestamp(row.last_state_at) ? row.last_state_at!.toISOString() : '',
      metadata: row.metadata as SessionMetadata,
      locationSample: row.location_sample || [],
      actualPath: row.actual_path || [],
      metrics: row.metrics || {},
      version: row.version || 1,
    };
  }

  async createRoute(route: Route, ctx: RouteContext = {}): Promise<Route> {
    const expectedVersion =
      Number.isFinite(Number(ctx.expectedVersion)) ? Number(ctx.expectedVersion) : null;
    const existing = await this.getRoute(route.id, null);
    if (!existing) {
      await this.ensureUser(route.userId);
      await pgPool!.query(
        `
        INSERT INTO routes (id, user_id, version, anchor_version, status, created_at, updated_at, payload)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
        `,
        [route.id, route.userId, route.version || 1, route.anchorVersion || 1, route.status || 'active', JSON.stringify(route)]
      );
      await pgPool!.query(
        `
        INSERT INTO route_versions (id, route_id, version, snapshot, changed_by, change_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [newId('rv'), route.id, route.version || 1, JSON.stringify(route), route.userId, ctx.changeReason || 'create']
      );
      return clonePayload(route);
    }
    const rows = await this.query(
      `SELECT payload, version, user_id FROM routes WHERE id = $1`,
      [route.id]
    );
    const current = rows[0] as { payload: Route; version: number; user_id: string } | undefined;
    if (!current) return null!;
    const currentVersion = Number(current.version || 0);
    const routeUser = current.user_id;
    if (routeUser && routeUser !== route.userId) {
      return null!;
    }
    if (expectedVersion !== null && currentVersion !== expectedVersion) {
      throw new Error('route_version_conflict');
    }
    await pgPool!.query(
      `
      INSERT INTO route_versions (id, route_id, version, snapshot, changed_by, change_reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (route_id, version) DO NOTHING
      `,
      [newId('rv'), route.id, currentVersion, JSON.stringify(current.payload), routeUser, ctx.changeReason || 'update']
    );
    await pgPool!.query(
      `
      UPDATE routes
      SET version = $2, anchor_version = $3, updated_at = NOW(), payload = $4, status = $5
      WHERE id = $1
      `,
      [route.id, route.version, route.anchorVersion, JSON.stringify(route), route.status || 'active']
    );
    return clonePayload(route);
  }

  async getRoute(routeId: string, userId: string | null): Promise<Route | null> {
    const rows = await this.query(
      `SELECT payload, user_id FROM routes WHERE id = $1`,
      [routeId]
    );
    if (!rows.length) return null;
    const item = rows[0] as { payload: string; user_id: string };
    if (userId && item.user_id !== userId) return null;
    return clonePayload(JSON.parse(typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload)));
  }

  async listUserRuns(query: ListRunsQuery): Promise<ListRunsResult> {
    const { userId, page = 1, limit = 20, status, search } = query;
    const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const normalizedPage = Math.max(1, Number(page) || 1);
    const offset = (normalizedPage - 1) * normalizedLimit;
    const statusFilter = status ? String(status) : null;
    const searchFilter = search ? `%${String(search).toLowerCase()}%` : null;
    const countRows = await this.query(
      `
      SELECT COUNT(*)::int AS total
      FROM routes
      WHERE user_id = $1
      AND ($2::text IS NULL OR status = $2)
      `,
      [userId, statusFilter]
    );
    const rows = await this.query(
      `
      SELECT payload
      FROM routes
      WHERE user_id = $1
      AND ($2::text IS NULL OR status = $2)
      AND (
        $3::text IS NULL
        OR LOWER(payload->>'id') LIKE $3
        OR LOWER(COALESCE(payload->'source'->>'filename','')) LIKE $3
      )
      ORDER BY updated_at DESC
      LIMIT $4 OFFSET $5
      `,
      [userId, statusFilter, searchFilter, normalizedLimit, offset]
    );
    return {
      total: Number(countRows[0]?.total || 0),
      runs: rows.map((row) => {
        const payload = (row as { payload: string }).payload;
        return clonePayload(JSON.parse(typeof payload === 'string' ? payload : JSON.stringify(payload)));
      }),
      page: normalizedPage,
      limit: normalizedLimit,
    };
  }

  async createSession(session: Session): Promise<Session> {
    await this.ensureUser(session.userId);
    const metadata = session.metadata || ({} as SessionMetadata);
    const idempotencyKey = metadata.idempotencyKey || null;
    const payload = {
      id: session.id,
      routeId: session.routeId,
      userId: session.userId,
      provider: session.provider,
      status: session.status,
      cursor: session.cursor || 0,
      currentAccuracy: session.currentAccuracy || null,
      deviationScore: session.deviationScore || 0,
      pathVersion: session.pathVersion || 1,
      startedAt: session.startedAt || nowTimestamp(),
      lastStateAt: session.lastStateAt || nowTimestamp(),
      locationSample: Array.isArray(session.locationSample) ? session.locationSample : [],
      actualPath: Array.isArray(session.actualPath) ? session.actualPath : [],
      metadata,
      metrics: session.metrics || {},
      version: session.version || 1,
      idempotencyKey,
    };
    try {
      await pgPool!.query(
        `
        INSERT INTO run_sessions (
          id, route_id, user_id, status, provider, cursor, current_accuracy, deviation_score,
          path_version, created_at, updated_at, started_at, last_state_at, location_sample, actual_path, metadata, metrics, version, idempotency_key
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW(),NOW(),NOW(),$10,$11,$12,$13,$14,$15
        )
        `,
        [
          payload.id,
          payload.routeId,
          payload.userId,
          payload.status,
          payload.provider,
          payload.cursor,
          payload.currentAccuracy,
          payload.deviationScore,
          payload.pathVersion,
          toJson(payload.locationSample, '[]'),
          toJson(payload.actualPath, '[]'),
          toJson(payload.metadata, '{}'),
          toJson(payload.metrics, '{}'),
          payload.version,
          payload.idempotencyKey,
        ]
      );
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        const existed = await this.getSession(session.id, session.userId);
        if (existed) return existed;
      }
      throw err;
    }
    return this.getSession(payload.id, session.userId) as Promise<Session>;
  }

  async getSession(sessionId: string, userId: string | null): Promise<Session | null> {
    const rows = await this.query(
      `
      SELECT
        id, route_id, user_id, status, provider, cursor, current_accuracy, deviation_score, path_version,
        started_at, finished_at, paused_at, created_at, updated_at, last_state_at, metadata,
        location_sample, actual_path, metrics, version
      FROM run_sessions
      WHERE id = $1
      `,
      [sessionId]
    );
    if (!rows.length) return null;
    const row = rows[0] as unknown as SessionDbRow;
    if (userId && row.user_id !== userId) return null;
    return this.mapSessionDbRow(row);
  }

  async appendLocation(
    sessionId: string,
    point: GeoPoint,
    userId: string | null
  ): Promise<AppendLocationResult | null> {
    const normalized = normalizePoint(point);
    if (!normalized) {
      return {
        session: null!,
        accepted: false,
        reason: 'invalid point',
        pointIndex: -1,
        lagHint: null,
      };
    }
    const accuracy = Number.isFinite((point as unknown as Record<string, unknown>).accuracy as number)
      ? ((point as unknown as Record<string, unknown>).accuracy as number)
      : null;
    const client = await pgPool!.connect();
    try {
      await client.query('BEGIN');
      const rows = await client.query(
        `
        SELECT id, user_id, status, cursor, location_sample, actual_path, version
        FROM run_sessions
        WHERE id = $1
        FOR UPDATE
        `,
        [sessionId]
      );
      if (!rows.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const sessionRow = rows.rows[0] as Record<string, unknown>;
      if (userId && sessionRow.user_id !== userId) {
        await client.query('ROLLBACK');
        return {
          session: this.mapSessionDbRow(sessionRow as unknown as SessionDbRow),
          accepted: false,
          reason: 'forbidden',
          pointIndex: -1,
          lagHint: null,
        };
      }
      if (sessionRow.status !== 'running' && sessionRow.status !== 'created') {
        await client.query('ROLLBACK');
        const pointCount = Array.isArray(sessionRow.location_sample)
          ? sessionRow.location_sample.length
          : 0;
        return {
          session: this.mapSessionDbRow(sessionRow as unknown as SessionDbRow),
          accepted: false,
          reason: sessionRow.status === 'paused' ? 'session_paused' : 'session_not_active',
          pointIndex: pointCount,
          lagHint: sessionRow.status === 'paused' ? 'paused' : 'not_running',
        };
      }

      const seqResult = await client.query(
        `
        SELECT COALESCE(MAX(seq), 0) + 1 AS seq
        FROM run_location_events
        WHERE session_id = $1
        `,
        [sessionId]
      );
      const seq = Number(seqResult.rows[0]?.seq || 1);
      const locationSample: LocationEntry[] = Array.isArray(sessionRow.location_sample)
        ? [...(sessionRow.location_sample as LocationEntry[])]
        : [];
      const actualPath: GeoPoint[] = Array.isArray(sessionRow.actual_path)
        ? [...(sessionRow.actual_path as GeoPoint[])]
        : [];
      const ts = Date.now();
      const sampleEntry: LocationEntry = { lat: normalized.lat, lng: normalized.lng, accuracy, ts };
      locationSample.push(sampleEntry);
      actualPath.push({ lat: normalized.lat, lng: normalized.lng, ts });

      await client.query(
        `
        INSERT INTO run_location_events (id, session_id, seq, lat, lng, accuracy, ts)
        VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
        `,
        [newId('loc'), sessionId, seq, sampleEntry.lat, sampleEntry.lng, accuracy, ts]
      );
      await client.query(
        `
        UPDATE run_sessions
        SET
          status = 'running',
          cursor = $2,
          current_accuracy = $3,
          location_sample = $4,
          actual_path = $5,
          version = version + 1,
          updated_at = NOW(),
          last_state_at = NOW()
        WHERE id = $1
        `,
        [sessionId, locationSample.length, accuracy, toJson(locationSample, '[]'), toJson(actualPath, '[]')]
      );
      await client.query('COMMIT');
      const session = await this.getSession(sessionId, userId);
      return {
        session: session!,
        accepted: true,
        reason: null,
        pointIndex: locationSample.length - 1,
        lagHint: null,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateSession(
    sessionId: string,
    payload: Partial<Session>,
    userId: string | null
  ): Promise<Session | null> {
    const client = await pgPool!.connect();
    try {
      await client.query('BEGIN');
      const rows = await client.query(`SELECT * FROM run_sessions WHERE id = $1 FOR UPDATE`, [sessionId]);
      if (!rows.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const base = rows.rows[0] as Record<string, unknown>;
      if (userId && base.user_id !== userId) {
        await client.query('ROLLBACK');
        return null;
      }

      const sets: string[] = [];
      const params: unknown[] = [];
      let i = 2;

      const setField = (key: string, value: unknown): void => {
        sets.push(`${key} = $${i}`);
        params.push(value);
        i += 1;
      };

      if (payload.status) setField('status', payload.status);
      if (Object.prototype.hasOwnProperty.call(payload, 'currentAccuracy'))
        setField('current_accuracy', payload.currentAccuracy);
      if (Object.prototype.hasOwnProperty.call(payload, 'deviationScore'))
        setField('deviation_score', payload.deviationScore);
      if (Object.prototype.hasOwnProperty.call(payload, 'cursor'))
        setField('cursor', payload.cursor);
      if (Object.prototype.hasOwnProperty.call(payload, 'metadata'))
        setField('metadata', toJson(payload.metadata, '{}'));
      if (Object.prototype.hasOwnProperty.call(payload, 'metrics'))
        setField('metrics', toJson(payload.metrics, '{}'));
      if (Object.prototype.hasOwnProperty.call(payload, 'locationSample'))
        setField('location_sample', toJson(payload.locationSample, '[]'));
      if (Object.prototype.hasOwnProperty.call(payload, 'actualPath'))
        setField('actual_path', toJson(payload.actualPath, '[]'));
      if (Object.prototype.hasOwnProperty.call(payload, 'finishedAt'))
        setField('finished_at', new Date(payload.finishedAt!));

      if (payload.status === 'paused') {
        setField('paused_at', nowTimestamp());
      }
      setField('updated_at', new Date());
      setField('last_state_at', new Date());
      setField('version', Number(base.version) + 1);

      const query = `
        UPDATE run_sessions
        SET ${sets.join(', ')}
        WHERE id = $1
        RETURNING id, route_id, user_id, status, provider, cursor, current_accuracy, deviation_score,
          path_version, started_at, finished_at, paused_at, created_at, updated_at, last_state_at,
          location_sample, actual_path, metadata, metrics, version
      `;
      const rowsUpdated = await client.query(query, [sessionId, ...params]);
      await client.query('COMMIT');
      return this.mapSessionDbRow(rowsUpdated.rows[0] as unknown as SessionDbRow);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (pgPool) {
      await pgPool.end();
    }
  }

  /** PostgresStorage 未实现 saveSession，直接抛出不支持错误 */
  async saveSession(_session: Session): Promise<Session> {
    throw new Error('PostgresStorage.saveSession not implemented - use createSession instead');
  }
}

// ===== 存储实例管理 =====

// PostgreSQL 连接池（全局单例）
let pgPool: import('pg').Pool | null = null;
// 当前是否使用 PostgreSQL
let usePostgres = false;
// 存储模式配置
const configuredMode = (process.env.TRACECRAFT_STORAGE || '').toLowerCase();
// PostgreSQL 连接字符串
const connectionString =
  process.env.DATABASE_URL || process.env.PG_URL || process.env.PG_CONNECTION_STRING;
// JSON 数据文件路径
const DATA_FILE = process.env.TRACECRAFT_DATA_FILE || path.join(__dirname, '../../data/state.json');

let storage: IStorage | null = null;
let initPromise: Promise<IStorage> | null = null;

/** 检测是否应使用 PostgreSQL */
async function detectPostgres(): Promise<boolean> {
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
  return {
    routes: memoryState.routes,
    sessions: memoryState.sessions,
    users: Array.from(memoryState.users),
    createdAt: memoryState.createdAt,
    updatedAt: memoryState.updatedAt,
  };
}

export function listUserRunIds(): string[] {
  return Object.keys(memoryState.routes || {});
}

export function normalizePoints(points: unknown[]): GeoPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .map(normalizePoint)
    .filter((p): p is GeoPoint => p !== null)
    .map((p) => ({ lat: p.lat, lng: p.lng, ts: Date.now() }));
}
