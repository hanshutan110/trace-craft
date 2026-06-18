/**
 * TraceCraft PostgreSQL 存储实现
 *
 * 使用连接池管理数据库连接，支持事务操作
 * 表结构：users、routes、route_versions、run_sessions、run_location_events、run_audit_logs
 */

import pgModule from 'pg';
import { newId } from '../utils/id';
import type {
  GeoPoint,
  Route,
  Session,
  LocationEntry,
  SessionMetadata,
  RouteContext,
  ListRunsQuery,
  ListRunsResult,
  AppendLocationResult,
  IStorage,
} from '../../../shared/types';
import { normalizePoint } from './geo-utils';

// ===== 内部工具函数 =====

/** JSON 安全序列化（失败时返回 fallback 字符串） */
function toJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/** 深拷贝对象（通过 JSON 序列化/反序列化实现） */
function clonePayload<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/** 获取当前时间 ISO 字符串 */
function nowTimestamp(): string {
  return new Date().toISOString();
}

/** 安全转换时间戳，无效值返回 null */
function toPgTimestamp(value: unknown): Date | null {
  if (!value) return null;
  return new Date(value as string | Date);
}

// ===== 数据库行类型（snake_case） =====

/** 数据库行类型（与 PostgreSQL 表结构对应的 snake_case 映射） */
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
  metrics: import('../../../shared/types').SessionMetrics;
  version: number;
}

// ===== PostgreSQL 连接管理 =====

/** PostgreSQL 连接池（全局单例） */
export let pgPool: import('pg').Pool | null = null;

const connectionString =
  process.env.DATABASE_URL || process.env.PG_URL || process.env.PG_CONNECTION_STRING;

export function getConnectionString(): string | undefined {
  return connectionString;
}

// ===== PostgresStorage 实现 =====

/**
 * PostgreSQL 存储实现
 *
 * 核心表：
 *   - users：用户基础信息 + metadata JSONB
 *   - routes：路线数据（payload JSONB 存储完整路线对象）
 *   - route_versions：路线变更历史快照
 *   - run_sessions：跑步会话（状态、轨迹、指标）
 *   - run_location_events：上报位置事件（完整历史）
 *   - run_audit_logs：审计日志
 */
export class PostgresStorage implements IStorage {
  /** 初始化连接池 + 建表 + 建索引 */
  async init(): Promise<void> {
    if (pgPool) return;
    if (!connectionString) {
      throw new Error('postgres_not_configured');
    }
    pgPool = new pgModule.Pool({
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

  /** 确保所有表结构存在（幂等，仅创建不存在的表） */
  private async ensureSchema(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      )`,
      `CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        anchor_version INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payload JSONB NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS route_versions (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        version INT NOT NULL,
        snapshot JSONB NOT NULL,
        changed_by TEXT,
        change_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(route_id, version)
      )`,
      `CREATE TABLE IF NOT EXISTS run_sessions (
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
      )`,
      `CREATE TABLE IF NOT EXISTS run_location_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES run_sessions(id) ON DELETE CASCADE,
        seq INT NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        accuracy DOUBLE PRECISION,
        ts TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(session_id, seq)
      )`,
      `CREATE TABLE IF NOT EXISTS run_audit_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES run_sessions(id) ON DELETE SET NULL,
        route_id TEXT,
        user_id TEXT,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    ];
    for (const sql of statements) {
      await pgPool!.query(sql);
    }
  }

  /** 创建索引 + 补充历史迁移字段 */
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
      // 用户收藏查询索引
      `CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created ON user_favorites(user_id, created_at DESC)`,
      // 通知查询索引
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC)`,
      // 社区帖子 Feed 查询索引
      `CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON community_posts(status, review_status, published_at DESC NULLS LAST)`,
      // 社区举报查询索引
      `CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status, created_at DESC)`,
      // 用户反馈查询索引
      `CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status, created_at DESC)`,
    ];
    for (const sql of sqls) {
      await pgPool!.query(sql);
    }
  }

  /** 确保用户存在（幂等插入） */
  private async ensureUser(userId: string): Promise<void> {
    await pgPool!.query(
      `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [userId]
    );
  }

  /** 将数据库行映射为 camelCase 会话对象 */
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

  /**
   * 创建或更新路线
   * - 首次创建：插入 routes + route_versions，返回克隆对象
   * - 已存在：校验用户归属和版本冲突，追加新版本快照并更新 payload
   */
  async createRoute(route: Route, ctx: RouteContext = {}): Promise<Route | null> {
    const expectedVersion =
      Number.isFinite(Number(ctx.expectedVersion)) ? Number(ctx.expectedVersion) : null;
    const existing = await this.getRoute(route.id, null);
    const client = await pgPool!.connect();
    try {
      await client.query('BEGIN');
      if (!existing) {
        await client.query(
          `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
          [route.userId]
        );
        await client.query(
          `INSERT INTO routes (id, user_id, version, anchor_version, status, created_at, updated_at, payload)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)`,
          [route.id, route.userId, route.version || 1, route.anchorVersion || 1, route.status || 'active', JSON.stringify(route)]
        );
        await client.query(
          `INSERT INTO route_versions (id, route_id, version, snapshot, changed_by, change_reason, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [newId('rv'), route.id, route.version || 1, JSON.stringify(route), route.userId, ctx.changeReason || 'create']
        );
        await client.query('COMMIT');
        return clonePayload(route);
      }
      const rows = await client.query(
        `SELECT payload, version, user_id FROM routes WHERE id = $1`,
        [route.id]
      );
      const current = rows.rows[0] as { payload: Route; version: number; user_id: string } | undefined;
      if (!current) {
        await client.query('ROLLBACK');
        return null;
      }
      const currentVersion = Number(current.version || 0);
      const routeUser = current.user_id;
      if (routeUser && routeUser !== route.userId) {
        await client.query('ROLLBACK');
        return null;
      }
      if (expectedVersion !== null && currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        throw new Error('route_version_conflict');
      }
      await client.query(
        `INSERT INTO route_versions (id, route_id, version, snapshot, changed_by, change_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (route_id, version) DO NOTHING`,
        [newId('rv'), route.id, currentVersion, JSON.stringify(current.payload), routeUser, ctx.changeReason || 'update']
      );
      await client.query(
        `UPDATE routes SET version = $2, anchor_version = $3, updated_at = NOW(), payload = $4, status = $5 WHERE id = $1`,
        [route.id, route.version, route.anchorVersion, JSON.stringify(route), route.status || 'active']
      );
      await client.query('COMMIT');
      return clonePayload(route);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
      `SELECT COUNT(*)::int AS total FROM routes WHERE user_id = $1
       AND ($2::text IS NULL OR status = $2)
       AND (
         $3::text IS NULL
         OR LOWER(payload->>'id') LIKE $3
         OR LOWER(COALESCE(payload->'source'->>'filename','')) LIKE $3
         OR LOWER(COALESCE(payload->>'shapeType','')) LIKE $3
       )`,
      [userId, statusFilter, searchFilter]
    );
    const rows = await this.query(
      `SELECT payload FROM routes WHERE user_id = $1
       AND ($2::text IS NULL OR status = $2)
       AND (
         $3::text IS NULL
         OR LOWER(payload->>'id') LIKE $3
         OR LOWER(COALESCE(payload->'source'->>'filename','')) LIKE $3
         OR LOWER(COALESCE(payload->>'shapeType','')) LIKE $3
       )
       ORDER BY updated_at DESC LIMIT $4 OFFSET $5`,
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
        `INSERT INTO run_sessions (
          id, route_id, user_id, status, provider, cursor, current_accuracy, deviation_score,
          path_version, created_at, updated_at, started_at, last_state_at, location_sample, actual_path, metadata, metrics, version, idempotency_key
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW(),NOW(),NOW(),$10,$11,$12,$13,$14,$15)`,
        [
          payload.id, payload.routeId, payload.userId, payload.status, payload.provider,
          payload.cursor, payload.currentAccuracy, payload.deviationScore, payload.pathVersion,
          toJson(payload.locationSample, '[]'), toJson(payload.actualPath, '[]'),
          toJson(payload.metadata, '{}'), toJson(payload.metrics, '{}'),
          payload.version, payload.idempotencyKey,
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
      `SELECT id, route_id, user_id, status, provider, cursor, current_accuracy, deviation_score, path_version,
        started_at, finished_at, paused_at, created_at, updated_at, last_state_at, metadata,
        location_sample, actual_path, metrics, version
       FROM run_sessions WHERE id = $1`,
      [sessionId]
    );
    if (!rows.length) return null;
    const row = rows[0] as unknown as SessionDbRow;
    if (userId && row.user_id !== userId) return null;
    return this.mapSessionDbRow(row);
  }

  /**
   * 上报位置点（事务操作）
   * - 校验会话状态（必须 running/created）
   * - 追加到 run_location_events（完整历史）
   * - 更新 run_sessions 的 location_sample/actual_path（环形缓冲，最多 200 条）
   */
  async appendLocation(
    sessionId: string,
    point: GeoPoint,
    userId: string | null
  ): Promise<AppendLocationResult | null> {
    const normalized = normalizePoint(point);
    if (!normalized) {
      return { session: null as unknown as Session, accepted: false, reason: 'invalid_point', pointIndex: -1, lagHint: null };
    }
    const accuracy = Number.isFinite((point as unknown as Record<string, unknown>).accuracy as number)
      ? ((point as unknown as Record<string, unknown>).accuracy as number)
      : null;
    const client = await pgPool!.connect();
    try {
      await client.query('BEGIN');
      const rows = await client.query(
        `SELECT id, user_id, status, cursor, location_sample, actual_path, version
         FROM run_sessions WHERE id = $1 FOR UPDATE`,
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
          accepted: false, reason: 'forbidden', pointIndex: -1, lagHint: null,
        };
      }
      if (sessionRow.status !== 'running' && sessionRow.status !== 'created') {
        await client.query('ROLLBACK');
        const pointCount = Array.isArray(sessionRow.location_sample) ? (sessionRow.location_sample as unknown[]).length : 0;
        return {
          session: this.mapSessionDbRow(sessionRow as unknown as SessionDbRow),
          accepted: false,
          reason: sessionRow.status === 'paused' ? 'session_paused' : 'session_not_active',
          pointIndex: pointCount,
          lagHint: sessionRow.status === 'paused' ? 'paused' : 'not_running',
        };
      }

      const seqResult = await client.query(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM run_location_events WHERE session_id = $1`,
        [sessionId]
      );
      const seq = Number(seqResult.rows[0]?.seq || 1);
      const rawSample: LocationEntry[] = Array.isArray(sessionRow.location_sample)
        ? [...(sessionRow.location_sample as LocationEntry[])]
        : [];
      const rawPath: GeoPoint[] = Array.isArray(sessionRow.actual_path)
        ? [...(sessionRow.actual_path as GeoPoint[])]
        : [];
      const ts = Date.now();
      const sampleEntry: LocationEntry = { lat: normalized.lat, lng: normalized.lng, accuracy, ts };
      rawSample.push(sampleEntry);
      rawPath.push({ lat: normalized.lat, lng: normalized.lng, ts });
      // 只保留最近 200 条，防止数组无限增长；完整历史存于 run_location_events
      const LOCATION_SAMPLE_MAX = 200;
      const locationSample = rawSample.slice(-LOCATION_SAMPLE_MAX);
      const actualPath = rawPath.slice(-LOCATION_SAMPLE_MAX);

      await client.query(
        `INSERT INTO run_location_events (id, session_id, seq, lat, lng, accuracy, ts)
         VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))`,
        [newId('loc'), sessionId, seq, sampleEntry.lat, sampleEntry.lng, accuracy, ts]
      );
      await client.query(
        `UPDATE run_sessions SET status = 'running', cursor = $2, current_accuracy = $3,
         location_sample = $4, actual_path = $5, version = version + 1, updated_at = NOW(), last_state_at = NOW()
         WHERE id = $1`,
        [sessionId, locationSample.length, accuracy, toJson(locationSample, '[]'), toJson(actualPath, '[]')]
      );
      await client.query('COMMIT');
      const session = await this.getSession(sessionId, userId);
      return { session: session ?? (null as unknown as Session), accepted: true, reason: null, pointIndex: locationSample.length - 1, lagHint: null };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * 更新会话（事务操作）
   * - 支持部分字段更新（状态、指标、轨迹、元数据等）
   * - 自动递增版本号，更新 updated_at/last_state_at
   */
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
        UPDATE run_sessions SET ${sets.join(', ')}
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

  /** saveSession 委托到 createSession（内部已处理存在性检查与更新） */
  async saveSession(session: Session): Promise<Session> {
    return this.createSession(session);
  }
}
