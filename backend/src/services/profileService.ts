/**
 * TraceCraft 用户资料服务
 *
 * 职责：
 *   - 查询/更新用户资料、设置
 *   - 汇总跑步历史统计
 *   - 跑步历史列表
 *
 * 数据来源：users 表 (metadata JSONB) + auth_identities + routes + run_sessions
 */
import { initStorage } from './storage';
import { pgPool } from './postgres-storage';
import { newId } from '../utils/id';

/** 用户偏好设置（距离单位、语音播报、震动反馈、地图样式、线宽） */
export interface UserSettings {
  distanceUnit: 'km' | 'mile';
  voiceBroadcast: boolean;
  vibeDeviation: boolean;
  mapStyle: 'light' | 'satellite';
  lineWeight: 'thin' | 'mid' | 'thick';
}

/** 用户累计统计（总距离、时长、路线数、完成次数、收藏数） */
export interface UserStats {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalRoutes: number;
  completedRuns: number;
  favoriteCount: number;
}

function normalizeSettings(value: Record<string, unknown> | undefined): UserSettings {
  return {
    distanceUnit: value?.distanceUnit === 'mile' ? 'mile' : 'km',
    voiceBroadcast: value?.voiceBroadcast !== false,
    vibeDeviation: value?.vibeDeviation !== false,
    mapStyle: value?.mapStyle === 'satellite' ? 'satellite' : 'light',
    lineWeight: value?.lineWeight === 'thin' || value?.lineWeight === 'thick' ? value.lineWeight : 'mid',
  };
}

/** 合并元数据（浅合并，patch 覆盖原有字段） */
function mergeMetadata(metadata: Record<string, unknown> | null | undefined, patch: Record<string, unknown>): Record<string, unknown> {
  return {
    ...(metadata || {}),
    ...patch,
  };
}

/** 确保 PostgreSQL 连接池已初始化 */
async function ensurePostgres(): Promise<void> {
  await initStorage();
  if (!pgPool) {
    throw new Error('postgres_profile_required');
  }
}

/** 获取用户完整资料：基本信息 + 统计数据 + 设置（4 查询并行） */
export async function getUserProfile(userId: string): Promise<Record<string, unknown>> {
  await ensurePostgres();
  await pgPool!.query(
    `INSERT INTO users (id, metadata)
     VALUES ($1, '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [userId],
  );

  const [userResult, identityResult, routeStats, sessionStats] = await Promise.all([
    pgPool!.query('SELECT id, metadata, created_at FROM users WHERE id = $1 LIMIT 1', [userId]),
    pgPool!.query(
      `SELECT provider, display_name FROM auth_identities WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId],
    ),
    pgPool!.query(
      `SELECT
         COUNT(*)::int AS total_routes,
         COALESCE(SUM(COALESCE((payload->>'actualDistanceM')::double precision, 0)), 0) AS planned_distance_m
       FROM routes
       WHERE user_id = $1`,
      [userId],
    ),
    pgPool!.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'finished')::int AS completed_runs,
         COALESCE(SUM(COALESCE((metrics->>'actualDistanceM')::double precision, 0)), 0) AS actual_distance_m,
         COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(finished_at, updated_at) - COALESCE(started_at, created_at)))), 0) AS duration_sec
       FROM run_sessions
       WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const metadata = (userResult.rows[0]?.metadata || {}) as Record<string, unknown>;

  const actualDistanceM = Number(sessionStats.rows[0]?.actual_distance_m || 0);
  const plannedDistanceM = Number(routeStats.rows[0]?.planned_distance_m || 0);
  const stats: UserStats = {
    totalDistanceKm: Math.round(((actualDistanceM || plannedDistanceM) / 1000) * 10) / 10,
    totalDurationHours: Math.round((Number(sessionStats.rows[0]?.duration_sec || 0) / 3600) * 10) / 10,
    totalRoutes: Number(routeStats.rows[0]?.total_routes || 0),
    completedRuns: Number(sessionStats.rows[0]?.completed_runs || 0),
    favoriteCount: Number((metadata.favoriteCount as number | undefined) || 0),
  };

  const displayName =
    (metadata.displayName as string | undefined) ||
    (identityResult.rows[0]?.display_name as string | undefined) ||
    '轨迹跑者';

  return {
    userId,
    displayName,
    signature: (metadata.signature as string | undefined) || '个性签名: 用汗水在水泥地上书写画作',
    badge: (metadata.badge as string | undefined) || (stats.completedRuns >= 10 ? '中级达人' : '新手跑者'),
    authProvider: identityResult.rows[0]?.provider || metadata.provider || 'guest',
    settings: normalizeSettings(metadata.settings as Record<string, unknown> | undefined),
    stats,
    createdAt: userResult.rows[0]?.created_at,
  };
}

/** 更新用户偏好设置（部分更新，返回更新后的完整资料） */
export async function updateUserSettings(userId: string, patch: Partial<UserSettings>): Promise<Record<string, unknown>> {
  await ensurePostgres();
  const current = await getUserProfile(userId);
  const settings = normalizeSettings({
    ...(current.settings as Record<string, unknown>),
    ...patch,
  });

  const userResult = await pgPool!.query('SELECT metadata FROM users WHERE id = $1 LIMIT 1', [userId]);
  const metadata = mergeMetadata(userResult.rows[0]?.metadata as Record<string, unknown> | undefined, { settings });
  await pgPool!.query('UPDATE users SET metadata = $2::jsonb WHERE id = $1', [userId, JSON.stringify(metadata)]);
  return {
    ...current,
    settings,
  };
}

/** 更新用户资料（displayName、signature、badge 等元数据字段） */
export async function updateUserProfile(userId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  await ensurePostgres();
  const current = await getUserProfile(userId);
  const allowedFields = ['displayName', 'signature', 'badge'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in patch) {
      if (typeof patch[key] !== 'string' || !String(patch[key]).trim()) {
        throw new Error('profile_field_required');
      }
      updates[key] = String(patch[key]).trim();
    }
  }
  if (Object.keys(updates).length > 0) {
    const userResult = await pgPool!.query('SELECT metadata FROM users WHERE id = $1 LIMIT 1', [userId]);
    const metadata = mergeMetadata(userResult.rows[0]?.metadata as Record<string, unknown> | undefined, updates);
    await pgPool!.query('UPDATE users SET metadata = $2::jsonb WHERE id = $1', [userId, JSON.stringify(metadata)]);
  }
  return { ...current, ...updates };
}

/** 提交用户反馈（内容必填，分类默认 general） */
export async function submitUserFeedback(userId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  await ensurePostgres();
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) throw new Error('feedback_content_required');
  const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'general';
  const contact = typeof body.contact === 'string' && body.contact.trim() ? body.contact.trim() : null;
  const id = newId('fb');
  await pgPool!.query(
    `INSERT INTO user_feedback (id, user_id, contact, category, content)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, contact, category, content]
  );
  return { id, userId, category, content, contact, status: 'open', createdAt: new Date().toISOString() };
}

/** 查询用户跑步历史记录（按完成时间倒序） */
export async function listRunHistory(userId: string, limit: number): Promise<Record<string, unknown>[]> {
  await ensurePostgres();
  const result = await pgPool!.query(
    `SELECT
       s.id AS session_id,
       s.route_id,
       s.status,
       s.created_at,
       s.started_at,
       s.finished_at,
       s.metrics,
       s.actual_path,
       r.payload AS route
     FROM run_sessions s
     LEFT JOIN routes r ON r.id = s.route_id
     WHERE s.user_id = $1
     ORDER BY COALESCE(s.finished_at, s.updated_at, s.created_at) DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows.map((row) => ({
    sessionId: row.session_id,
    routeId: row.route_id,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    metrics: row.metrics || {},
    actualPath: row.actual_path || [],
    route: row.route || null,
  }));
}
