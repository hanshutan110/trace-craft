import crypto from 'crypto';
import type {
  AdminListParams,
  AdminListResult,
  AdminModule,
  AdminModuleKey,
  AdminOverview,
  AdminOverviewMetric,
  AdminOverviewRecentItem,
  AdminOverviewTodo,
  AdminProfile,
} from '../../../shared/admin';
import { pgPool } from './postgres-storage';
import { toIso } from '../utils/date';
import { newId } from '../utils/id';
import { safeJsonObject } from '../utils/json';
import { signAdminTokenPayload, verifySignedAdminPayload } from './token';
import { logger } from './logger';

export type AdminActor = AdminProfile;

function requireDb(): void {
  if (!pgPool) throw new Error('postgres_not_configured');
}

function normalizePage(query: Partial<AdminListParams>): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(query.limit || 20)));
  return { page, limit, offset: (page - 1) * limit };
}

function signToken(actor: AdminActor): string {
  return signAdminTokenPayload({
    id: actor.id,
    username: actor.username,
    displayName: actor.displayName,
    roles: actor.roles,
    sessionId: actor.sessionId || '',
    ts: Date.now(),
  });
}

export function verifyAdminToken(token: string): AdminActor | null {
  try {
    const parsed = verifySignedAdminPayload(token) as AdminActor & { ts?: number } | null;
    if (!parsed) return null;
    const ttlHours = Math.max(1, Number(process.env.TRACECRAFT_ADMIN_TOKEN_TTL_HOURS || 12));
    if (parsed.ts && Date.now() - parsed.ts > ttlHours * 60 * 60 * 1000) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      displayName: parsed.displayName,
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
    };
  } catch {
    return null;
  }
}

export async function verifyAdminSession(token: string): Promise<AdminActor | null> {
  const actor = verifyAdminToken(token);
  if (!actor?.sessionId) return actor;
  requireDb();
  const rows = await pgPool!.query(
    `SELECT 1 FROM admin_sessions WHERE id = $1 AND admin_user_id = $2 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [actor.sessionId, actor.id]
  );
  return rows.rows[0] ? actor : null;
}

export async function revokeAdminSession(actor: AdminActor): Promise<void> {
  if (!actor.sessionId) return;
  requireDb();
  await pgPool!.query(
    `UPDATE admin_sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE id = $1 AND admin_user_id = $2`,
    [actor.sessionId, actor.id]
  );
}

const MODULE_PERMISSION_KEYS: Record<string, string[]> = {
  users: ['users'],
  roles: ['roles', 'users'],
  sessions: ['sessions', 'users'],
  contents: ['contents'],
  templates: ['templates'],
  communityPosts: ['community', 'communityPosts'],
  comments: ['community', 'comments'],
  reports: ['community', 'reports'],
  feedback: ['feedback'],
  assets: ['assets', 'users'],
  shareRecords: ['shareRecords', 'community'],
  auditLogs: ['auditLogs'],
  roleLibrary: ['roles', 'users'],
};
const KNOWN_PERMISSION_BASE_KEYS = [
  'users',
  'roles',
  'sessions',
  'contents',
  'templates',
  'community',
  'communityPosts',
  'comments',
  'reports',
  'feedback',
  'assets',
  'shareRecords',
  'auditLogs',
];
const KNOWN_PERMISSION_KEYS = new Set([
  '*',
  ...KNOWN_PERMISSION_BASE_KEYS.flatMap((key) => [`${key}.read`, `${key}.write`, `${key}.review`]),
]);

export async function canAdminAccess(actor: AdminActor, moduleKey: AdminModuleKey, action: 'read' | 'write'): Promise<boolean> {
  if (actor.roles.includes('super_admin')) return true;
  requireDb();
  const rows = await pgPool!.query(
    `SELECT permission_matrix FROM admin_roles WHERE code = ANY($1::text[]) AND is_active = TRUE`,
    [actor.roles]
  );
  const keys = MODULE_PERMISSION_KEYS[moduleKey] || [moduleKey];
  const wanted = new Set<string>(['*']);
  for (const key of keys) {
    wanted.add(`${key}.${action}`);
    if (action === 'read') wanted.add(`${key}.read`);
    if (action === 'write') {
      wanted.add(`${key}.write`);
      wanted.add(`${key}.review`);
    }
  }
  return rows.rows.some((row) => {
    const matrix = normalizePermissionMatrix(row.permission_matrix);
    return Array.from(wanted).some((key) => matrix[key] === true);
  });
}

function canReadModule(readableModules: Set<AdminModule>, moduleKey: AdminModule): boolean {
  return readableModules.has(moduleKey);
}

async function countSql(sql: string, params: unknown[] = []): Promise<number> {
  const result = await pgPool!.query(sql, params);
  return Number(result.rows[0]?.total || 0);
}

/**
 * 管理后台总览：只聚合当前管理员可读模块，避免低权限账号看到隐藏模块规模。
 */
export async function getAdminOverview(readableModules: AdminModule[]): Promise<AdminOverview> {
  requireDb();
  const readable = new Set(readableModules);
  const metrics: AdminOverviewMetric[] = [];
  const todos: AdminOverviewTodo[] = [];
  const recent: AdminOverviewRecentItem[] = [];

  if (canReadModule(readable, 'users')) {
    metrics.push({
      key: 'users',
      title: '用户数',
      value: await countSql(`SELECT COUNT(*)::int AS total FROM users`),
    });
  }

  if (canReadModule(readable, 'sessions')) {
    const [total, activeToday] = await Promise.all([
      countSql(`SELECT COUNT(*)::int AS total FROM run_sessions`),
      countSql(`SELECT COUNT(*)::int AS total FROM run_sessions WHERE created_at >= CURRENT_DATE`),
    ]);
    metrics.push({ key: 'sessions', title: '跑步会话', value: total, trend: `今日 ${activeToday}` });
  }

  if (canReadModule(readable, 'templates')) {
    metrics.push({
      key: 'templates',
      title: '启用模板',
      value: await countSql(`SELECT COUNT(*)::int AS total FROM route_templates WHERE is_active = TRUE`),
    });
  }

  if (canReadModule(readable, 'communityPosts')) {
    const [total, pending] = await Promise.all([
      countSql(`SELECT COUNT(*)::int AS total FROM community_posts`),
      countSql(`SELECT COUNT(*)::int AS total FROM community_posts WHERE review_status = 'pending'`),
    ]);
    metrics.push({ key: 'communityPosts', title: '社区帖子', value: total, trend: `待审 ${pending}` });
    todos.push({
      key: 'pending-posts',
      title: '社区帖子待审核',
      count: pending,
      module: 'communityPosts',
      status: 'pending',
      priority: pending > 0 ? 'high' : 'low',
    });
  }

  if (canReadModule(readable, 'reports')) {
    const openReports = await countSql(`SELECT COUNT(*)::int AS total FROM community_reports WHERE status = 'open'`);
    todos.push({
      key: 'open-reports',
      title: '举报待处理',
      count: openReports,
      module: 'reports',
      status: 'open',
      priority: openReports > 0 ? 'high' : 'low',
    });
  }

  if (canReadModule(readable, 'feedback')) {
    const openFeedback = await countSql(`SELECT COUNT(*)::int AS total FROM user_feedback WHERE status <> 'closed'`);
    todos.push({
      key: 'open-feedback',
      title: '用户反馈待跟进',
      count: openFeedback,
      module: 'feedback',
      status: 'open',
      priority: openFeedback > 0 ? 'medium' : 'low',
    });
  }

  if (canReadModule(readable, 'communityPosts')) {
    const rows = await pgPool!.query(
      `SELECT id, title, status, created_at
       FROM community_posts
       ORDER BY created_at DESC
       LIMIT 5`,
    );
    recent.push(...rows.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title || row.id),
      module: 'communityPosts' as AdminModule,
      status: String(row.status || ''),
      createdAt: toIso(row.created_at),
    })));
  }

  if (canReadModule(readable, 'feedback')) {
    const rows = await pgPool!.query(
      `SELECT id, content, status, created_at
       FROM user_feedback
       ORDER BY created_at DESC
       LIMIT 5`,
    );
    recent.push(...rows.rows.map((row) => ({
      id: String(row.id),
      title: String(row.content || row.id).slice(0, 60),
      module: 'feedback' as AdminModule,
      status: String(row.status || ''),
      createdAt: toIso(row.created_at),
    })));
  }

  recent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { metrics, todos, recent: recent.slice(0, 8), generatedAt: new Date().toISOString() };
}

function hashAdminSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizePermissionMatrix(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    return safeJsonObject(value);
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeAdminPermissionMatrix(value: unknown): Record<string, boolean> {
  const matrix = normalizePermissionMatrix(value);
  const normalized: Record<string, boolean> = {};
  Object.entries(matrix).forEach(([key, enabled]) => {
    if (!KNOWN_PERMISSION_KEYS.has(key)) throw new Error('admin_validation_permission_key_invalid');
    if (enabled !== true && enabled !== false) throw new Error('admin_validation_permission_value_invalid');
    normalized[key] = enabled;
  });
  return normalized;
}

function requireText(value: unknown, code: string, maxLength: number = 160): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(code);
  return text.slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeChoice(value: unknown, allowed: string[], fallback: string, code: string): string {
  const text = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  if (!allowed.includes(text)) throw new Error(code);
  return text;
}

function normalizeJsonObject(value: unknown, code: string): Record<string, unknown> {
  const parsed = typeof value === 'string' ? safeJsonObject(value) : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(code);
  }
  return parsed as Record<string, unknown>;
}

function hasField(payload: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

const AUDIT_REDACTED = '[REDACTED]';
const AUDIT_SENSITIVE_KEY_PATTERN = /(password|token|secret|credential|authorization|cookie|session|refresh|hash)/i;

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      AUDIT_SENSITIVE_KEY_PATTERN.test(key) ? AUDIT_REDACTED : sanitizeAuditValue(item),
    ]),
  );
}

function sanitizeAuditDiff(diff: Record<string, unknown>): Record<string, unknown> {
  return sanitizeAuditValue(diff) as Record<string, unknown>;
}

const ADMIN_USER_STATUSES = ['active', 'disabled', 'locked'];
const ADMIN_CODE_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

function requireCode(value: unknown, code: string): string {
  const text = requireText(value, code, 64);
  if (!ADMIN_CODE_PATTERN.test(text)) throw new Error(code);
  return text;
}

function normalizeRoleCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
}

function normalizeAdminUserPayload(payload: Record<string, unknown>, partial: boolean = false): Record<string, unknown> {
  const username = partial && payload.username === undefined ? undefined : requireCode(payload.username, 'admin_validation_username_invalid');
  const name = partial && payload.name === undefined ? undefined : requireText(payload.name || username, 'admin_validation_display_name_required', 120);
  const status = partial && payload.status === undefined ? undefined : normalizeChoice(payload.status, ADMIN_USER_STATUSES, 'active', 'admin_validation_user_status_invalid');
  return {
    username,
    name,
    phone: optionalText(payload.phone, 32),
    email: optionalText(payload.email, 160),
    status,
    passwordHash: payload.password ? hashAdminPassword(payload.password) : null,
    roles: hasField(payload, 'roles') ? normalizeRoleCodes(payload.roles) : undefined,
  };
}

function normalizeAdminRolePayload(payload: Record<string, unknown>, partial: boolean = false): Record<string, unknown> {
  return {
    code: partial && payload.code === undefined ? undefined : requireCode(payload.code, 'admin_validation_role_code_invalid'),
    name: partial && payload.name === undefined ? undefined : requireText(payload.name, 'admin_validation_role_name_required', 120),
    desc: optionalText(payload.desc, 500),
    permissionMatrix: payload.permissionMatrix === undefined ? undefined : normalizeAdminPermissionMatrix(payload.permissionMatrix),
    isActive: payload.isActive === undefined ? undefined : payload.isActive !== false,
  };
}

async function resolveAdminRoleIds(roles: string[]): Promise<Map<string, string>> {
  const roleMap = new Map<string, string>();
  if (roles.length === 0) return roleMap;
  const existing = await pgPool!.query(`SELECT id, code FROM admin_roles WHERE code = ANY($1::text[])`, [roles]);
  existing.rows.forEach((row) => roleMap.set(String(row.code), String(row.id)));
  const missing = roles.filter((code) => !roleMap.has(code));
  if (missing.length > 0) throw new Error('admin_validation_role_not_found');
  return roleMap;
}

async function getAdminRoleCode(id: string): Promise<string | null> {
  const rows = await pgPool!.query(`SELECT code FROM admin_roles WHERE id = $1 LIMIT 1`, [id]);
  return rows.rows[0] ? String(rows.rows[0].code || '') : null;
}

function normalizeContentPayload(payload: Record<string, unknown>, partial: boolean = false): Record<string, unknown> {
  const key = partial && payload.key === undefined ? undefined : requireText(payload.key, 'admin_validation_content_key_required', 96);
  const type = partial && payload.type === undefined ? undefined : normalizeChoice(payload.type, ['announcement', 'faq', 'help', 'policy'], 'announcement', 'admin_validation_content_type_invalid');
  const title = partial && payload.title === undefined ? undefined : requireText(payload.title, 'admin_validation_content_title_required', 160);
  const status = partial && payload.status === undefined ? undefined : normalizeChoice(payload.status, ['draft', 'published', 'archived'], 'draft', 'admin_validation_content_status_invalid');
  return {
    key,
    type,
    title,
    summary: optionalText(payload.summary, 300),
    body: optionalText(payload.body, 10000),
    status,
    sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
  };
}

function normalizeTemplatePayload(payload: Record<string, unknown>, partial: boolean = false): Record<string, unknown> {
  const code = partial && payload.code === undefined ? undefined : requireText(payload.code, 'admin_validation_template_code_required', 96);
  const name = partial && payload.name === undefined ? undefined : requireText(payload.name, 'admin_validation_template_name_required', 160);
  const category = partial && payload.category === undefined ? undefined : requireText(payload.category, 'admin_validation_template_category_required', 48);
  const shapeType = partial && payload.shapeType === undefined ? undefined : requireText(payload.shapeType, 'admin_validation_template_shape_required', 48);
  const previewPayload = partial && payload.previewPayload === undefined ? undefined : normalizeJsonObject(payload.previewPayload || {}, 'admin_validation_template_preview_invalid');
  const generationPayload = partial && payload.generationPayload === undefined ? undefined : normalizeJsonObject(payload.generationPayload || {}, 'admin_validation_template_generation_invalid');
  return {
    code,
    name,
    titleEn: optionalText(payload.titleEn, 160),
    category,
    shapeType,
    distanceKm: Math.max(0.5, Number(payload.distanceKm || 3)),
    previewPayload,
    generationPayload,
    isFeatured: Boolean(payload.isFeatured),
    isActive: payload.isActive !== false,
    sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
  };
}

function mapRole(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    desc: row.description || '',
    permissionMatrix: JSON.stringify(safeJsonObject(row.permission_matrix), null, 2),
    isActive: Boolean(row.is_active),
    updatedAt: toIso(row.updated_at),
  };
}

function mapAdminSession(row: Record<string, unknown>): Record<string, unknown> {
  const expiresAt = row.expires_at ? new Date(row.expires_at as string | Date).getTime() : 0;
  const revokedAt = row.revoked_at ? toIso(row.revoked_at) : '';
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    username: row.username || row.admin_user_id,
    ip: row.ip || '',
    userAgent: row.user_agent || '',
    expiresAt: toIso(row.expires_at),
    createdAt: toIso(row.created_at),
    revokedAt,
    status: revokedAt ? 'revoked' : expiresAt < Date.now() ? 'expired' : 'active',
  };
}

function mapAdminUser(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    username: row.username,
    name: row.display_name,
    phone: row.phone || '',
    email: row.email || '',
    roles: row.roles || [],
    status: row.status,
    updatedAt: toIso(row.updated_at),
  };
}

function mapContent(row: Record<string, unknown>): Record<string, unknown> {
  const body = safeJsonObject(row.body_json);
  return {
    id: row.id,
    key: row.content_key,
    type: row.content_type,
    title: row.title || '',
    summary: row.summary || '',
    body: typeof body.body === 'string' ? body.body : JSON.stringify(body),
    status: row.status,
    sortOrder: row.sort_order,
    updatedAt: toIso(row.updated_at),
  };
}

function mapTemplate(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    code: row.template_code,
    name: row.title,
    titleEn: row.title_en || '',
    category: row.category,
    shapeType: row.shape_type,
    distanceKm: Number(row.distance_km || 0),
    previewPayload: JSON.stringify(safeJsonObject(row.preview_payload), null, 2),
    generationPayload: JSON.stringify(safeJsonObject(row.generation_payload), null, 2),
    usageCount: Number(row.usage_count || 0),
    favoriteCount: Number(row.favorite_count || 0),
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    updatedAt: toIso(row.updated_at),
  };
}

function mapCommunityPost(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    author: row.author || row.user_id,
    title: row.title || '',
    content: row.content || '',
    status: row.status,
    reviewStatus: row.review_status,
    rejectReason: row.reject_reason || '',
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapCommunityComment(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    author: row.author || row.user_id,
    postTitle: row.post_title || row.post_id,
    content: row.content || '',
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapCommunityReport(row: Record<string, unknown>): Record<string, unknown> {
  const actionTaken = String(row.action_taken || '');
  return {
    id: row.id,
    postId: row.post_id,
    reporterId: row.reporter_id,
    reportType: row.report_type,
    reason: row.reason,
    status: row.status,
    actionTaken,
    hidePost: actionTaken.includes('hide_post'),
    createdAt: toIso(row.created_at),
    handledAt: row.handled_at ? toIso(row.handled_at) : '',
  };
}

function mapUserFeedback(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id || '',
    contact: row.contact || '',
    category: row.category,
    content: row.content,
    status: row.status,
    createdAt: toIso(row.created_at),
    handledAt: row.handled_at ? toIso(row.handled_at) : '',
  };
}

function mapUserAsset(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    assetType: row.asset_type,
    url: row.url,
    storageProvider: row.storage_provider || 'local',
    metadata: JSON.stringify(safeJsonObject(row.metadata), null, 2),
    createdAt: toIso(row.created_at),
  };
}

function mapShareRecord(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    routeId: row.route_id || '',
    sessionId: row.session_id || '',
    channel: row.channel,
    sharePayload: JSON.stringify(safeJsonObject(row.share_payload), null, 2),
    createdAt: toIso(row.created_at),
  };
}

function mapAuditLog(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    actorAdminId: row.actor_admin_id || '',
    action: row.action,
    targetType: row.target_type || '',
    targetId: row.target_id || '',
    requestPath: row.request_path,
    requestMethod: row.request_method,
    diff: JSON.stringify(safeJsonObject(row.diff), null, 2),
    createdAt: toIso(row.created_at),
  };
}

async function queryActorByUsername(username: string): Promise<AdminActor | null> {
  const rows = await pgPool!.query(
    `SELECT u.id, u.username, u.display_name, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
     FROM admin_users u
     LEFT JOIN admin_user_roles ur ON ur.admin_user_id = u.id
     LEFT JOIN admin_roles r ON r.id = ur.admin_role_id
     WHERE u.username = $1 AND u.status = 'active'
     GROUP BY u.id
     LIMIT 1`,
    [username]
  );
  const row = rows.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    roles: row.roles || [],
  };
}

export async function authenticateAdmin(
  username: string,
  password: string,
  meta: { ip?: string | null; userAgent?: string | null } = {}
): Promise<{ token: string; admin: AdminActor } | null> {
  requireDb();
  if (!username || !password) return null;
  const admin = await queryActorByUsername(username);
  if (!admin) return null;
  const passwordRows = await pgPool!.query(`SELECT password_hash FROM admin_users WHERE id = $1 LIMIT 1`, [admin.id]);
  const passwordHash = String(passwordRows.rows[0]?.password_hash || '');
  if (!verifyAdminPassword(password, passwordHash)) return null;
  const sessionId = newId('admin-session');
  const actor = { ...admin, sessionId };
  const token = signToken(actor);
  const ttlHours = Math.max(1, Number(process.env.TRACECRAFT_ADMIN_TOKEN_TTL_HOURS || 12));
  await pgPool!.query(
    `INSERT INTO admin_sessions (id, admin_user_id, refresh_token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, NOW() + ($4 || ' hours')::interval, NULLIF($5, '')::inet, $6)`,
    [sessionId, admin.id, hashAdminSessionToken(token), String(ttlHours), meta.ip || '', meta.userAgent || null]
  );
  await pgPool!.query(
    `UPDATE admin_users SET last_login_at = NOW(), last_login_ip = NULLIF($2, '')::inet, updated_at = NOW() WHERE id = $1`,
    [admin.id, meta.ip || '']
  );
  return { token, admin: actor };
}

function verifyAdminPassword(password: string, passwordHash: string): boolean {
  if (passwordHash.startsWith('scrypt:')) {
    const [, salt, expected] = passwordHash.split(':');
    if (!salt || !expected) return false;
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    if (Buffer.byteLength(actual) !== Buffer.byteLength(expected)) return false;
    return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  }
  if (passwordHash.startsWith('sha256:')) {
    const [, salt, expected] = passwordHash.split(':');
    const actual = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
    if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected)) return false;
    return Boolean(expected) && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  }
  // 仅本地显式开启时兼容旧种子账号，生产环境不允许默认口令回退。
  const localFallbackHashes = new Set([
    'password_login_disabled_until_admin_auth_ready',
    '$2y$12$placeholder_hash_need_replace',
  ]);
  if (localFallbackHashes.has(passwordHash) && process.env.TRACECRAFT_ALLOW_ADMIN_PASSWORD_FALLBACK === '1') {
    return Boolean(process.env.TRACECRAFT_ADMIN_PASSWORD) && password === process.env.TRACECRAFT_ADMIN_PASSWORD;
  }
  return false;
}

function hashAdminPassword(password: unknown): string {
  const normalized = typeof password === 'string' ? password : '';
  if (normalized.length < 10) {
    throw new Error('admin_password_too_weak');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(normalized, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export async function listAdminModule(
  moduleKey: AdminModuleKey,
  query: Partial<AdminListParams> = {}
): Promise<AdminListResult<Record<string, unknown>>> {
  requireDb();
  const { page, limit, offset } = normalizePage(query);
  const keyword = query.keyword ? `%${String(query.keyword).toLowerCase()}%` : null;

  if (moduleKey === 'roleLibrary') {
    const rows = await pgPool!.query(`SELECT * FROM admin_roles WHERE is_active = TRUE ORDER BY code ASC`);
    return {
      rows: rows.rows.map((row) => ({ code: row.code, name: row.name, desc: row.description || '', permissionMatrix: JSON.stringify(safeJsonObject(row.permission_matrix), null, 2) })),
      total: rows.rowCount || 0,
      page: 1,
      limit: rows.rowCount || 0,
    };
  }

  if (moduleKey === 'roles') {
    const active = query.status === 'active' ? true : query.status === 'disabled' ? false : null;
    const params = [active, keyword, limit, offset];
    const where = `
      WHERE ($1::boolean IS NULL OR is_active = $1)
        AND ($2::text IS NULL OR LOWER(code) LIKE $2 OR LOWER(name) LIKE $2 OR LOWER(COALESCE(description, '')) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM admin_roles ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(`SELECT * FROM admin_roles ${where} ORDER BY updated_at DESC, code ASC LIMIT $3 OFFSET $4`, params);
    return { rows: rows.rows.map(mapRole), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'sessions') {
    const status = query.status || null;
    const params = [status, keyword, limit, offset];
    const statusExpr = `CASE WHEN s.revoked_at IS NOT NULL THEN 'revoked' WHEN s.expires_at <= NOW() THEN 'expired' ELSE 'active' END`;
    const where = `
      WHERE ($1::text IS NULL OR ${statusExpr} = $1)
        AND ($2::text IS NULL OR LOWER(u.username) LIKE $2 OR LOWER(COALESCE(s.user_agent, '')) LIKE $2 OR LOWER(s.id) LIKE $2)`;
    const count = await pgPool!.query(
      `SELECT COUNT(*)::int AS total FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_user_id ${where}`,
      params.slice(0, 2)
    );
    const rows = await pgPool!.query(
      `SELECT s.*, u.username FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_user_id ${where} ORDER BY s.created_at DESC LIMIT $3 OFFSET $4`,
      params
    );
    return { rows: rows.rows.map(mapAdminSession), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'users') {
    const status = query.status || null;
    const roleCode = query.roleCode || null;
    const params = [status, keyword, roleCode, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR u.status = $1)
        AND ($2::text IS NULL OR LOWER(u.username) LIKE $2 OR LOWER(u.display_name) LIKE $2 OR LOWER(COALESCE(u.phone, '')) LIKE $2 OR LOWER(COALESCE(u.email, '')) LIKE $2)
        AND ($3::text IS NULL OR EXISTS (
          SELECT 1 FROM admin_user_roles xur
          JOIN admin_roles xr ON xr.id = xur.admin_role_id
          WHERE xur.admin_user_id = u.id AND xr.code = $3
        ))`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM admin_users u ${where}`, params.slice(0, 3));
    const rows = await pgPool!.query(
      `SELECT u.*, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
       FROM admin_users u
       LEFT JOIN admin_user_roles ur ON ur.admin_user_id = u.id
       LEFT JOIN admin_roles r ON r.id = ur.admin_role_id
       ${where}
       GROUP BY u.id
       ORDER BY u.updated_at DESC
       LIMIT $4 OFFSET $5`,
      params
    );
    return { rows: rows.rows.map(mapAdminUser), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'contents') {
    const status = query.status || null;
    const type = query.type || null;
    const params = [status, type, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR status = $1)
        AND ($2::text IS NULL OR content_type = $2)
        AND ($3::text IS NULL OR LOWER(content_key) LIKE $3 OR LOWER(COALESCE(title, '')) LIKE $3 OR LOWER(COALESCE(summary, '')) LIKE $3)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM admin_contents ${where}`, params.slice(0, 3));
    const rows = await pgPool!.query(
      `SELECT * FROM admin_contents ${where} ORDER BY sort_order ASC, updated_at DESC LIMIT $4 OFFSET $5`,
      params
    );
    return { rows: rows.rows.map(mapContent), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'templates') {
    const category = query.category || null;
    const active = query.status === 'active' ? true : query.status === 'disabled' ? false : null;
    const params = [category, active, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR category = $1)
        AND ($2::boolean IS NULL OR is_active = $2)
        AND ($3::text IS NULL OR LOWER(template_code) LIKE $3 OR LOWER(title) LIKE $3 OR LOWER(COALESCE(title_en, '')) LIKE $3 OR LOWER(shape_type) LIKE $3)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM route_templates ${where}`, params.slice(0, 3));
    const rows = await pgPool!.query(
      `SELECT * FROM route_templates ${where} ORDER BY is_featured DESC, sort_order ASC, updated_at DESC LIMIT $4 OFFSET $5`,
      params
    );
    return { rows: rows.rows.map(mapTemplate), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'communityPosts') {
    const reviewStatus = query.status || null;
    const params = [reviewStatus, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR p.review_status = $1)
        AND ($2::text IS NULL OR LOWER(p.title) LIKE $2 OR LOWER(p.content) LIKE $2 OR LOWER(p.user_id) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM community_posts p ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(
      `SELECT p.*, COALESCE(a.display_name, p.user_id) AS author
       FROM community_posts p
       LEFT JOIN auth_identities a ON a.user_id = p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      params
    );
    return { rows: rows.rows.map(mapCommunityPost), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'comments') {
    const status = query.status || null;
    const params = [status, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR c.status = $1)
        AND ($2::text IS NULL OR LOWER(c.content) LIKE $2 OR LOWER(c.user_id) LIKE $2 OR LOWER(c.post_id) LIKE $2 OR LOWER(COALESCE(p.title, '')) LIKE $2)`;
    const count = await pgPool!.query(
      `SELECT COUNT(*)::int AS total FROM community_comments c LEFT JOIN community_posts p ON p.id = c.post_id ${where}`,
      params.slice(0, 2)
    );
    const rows = await pgPool!.query(
      `SELECT c.*, COALESCE(a.display_name, c.user_id) AS author, p.title AS post_title
       FROM community_comments c
       LEFT JOIN community_posts p ON p.id = c.post_id
       LEFT JOIN auth_identities a ON a.user_id = c.user_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $3 OFFSET $4`,
      params
    );
    return { rows: rows.rows.map(mapCommunityComment), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'reports') {
    const status = query.status || null;
    const params = [status, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR status = $1)
        AND ($2::text IS NULL OR LOWER(report_type) LIKE $2 OR LOWER(reason) LIKE $2 OR LOWER(post_id) LIKE $2 OR LOWER(reporter_id) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM community_reports ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(`SELECT * FROM community_reports ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params);
    return { rows: rows.rows.map(mapCommunityReport), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'feedback') {
    const status = query.status || null;
    const params = [status, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR status = $1)
        AND ($2::text IS NULL OR LOWER(category) LIKE $2 OR LOWER(content) LIKE $2 OR LOWER(COALESCE(contact, '')) LIKE $2 OR LOWER(COALESCE(user_id, '')) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM user_feedback ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(`SELECT * FROM user_feedback ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params);
    return { rows: rows.rows.map(mapUserFeedback), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'assets') {
    const assetType = query.assetType || null;
    const params = [assetType, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR asset_type = $1)
        AND ($2::text IS NULL OR LOWER(user_id) LIKE $2 OR LOWER(asset_type) LIKE $2 OR LOWER(url) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM user_assets ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(`SELECT * FROM user_assets ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params);
    return { rows: rows.rows.map(mapUserAsset), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'shareRecords') {
    const channel = query.channel || null;
    const params = [channel, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR channel = $1)
        AND ($2::text IS NULL OR LOWER(user_id) LIKE $2 OR LOWER(COALESCE(route_id, '')) LIKE $2 OR LOWER(COALESCE(session_id, '')) LIKE $2 OR LOWER(channel) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM route_share_records ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(`SELECT * FROM route_share_records ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params);
    return { rows: rows.rows.map(mapShareRecord), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  if (moduleKey === 'auditLogs') {
    const action = query.status || null;
    const params = [action, keyword, limit, offset];
    const where = `
      WHERE ($1::text IS NULL OR action = $1)
        AND ($2::text IS NULL OR LOWER(action) LIKE $2 OR LOWER(COALESCE(target_type, '')) LIKE $2 OR LOWER(COALESCE(target_id, '')) LIKE $2 OR LOWER(request_path) LIKE $2)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM admin_audit_logs ${where}`, params.slice(0, 2));
    const rows = await pgPool!.query(`SELECT * FROM admin_audit_logs ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params);
    return { rows: rows.rows.map(mapAuditLog), total: Number(count.rows[0]?.total || 0), page, limit };
  }

  throw new Error('invalid_admin_module');
}

async function getAdminRecordById(moduleKey: AdminModuleKey, id: string): Promise<Record<string, unknown> | null> {
  if (moduleKey === 'users') {
    const rows = await pgPool!.query(
      `SELECT u.*, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
       FROM admin_users u
       LEFT JOIN admin_user_roles ur ON ur.admin_user_id = u.id
       LEFT JOIN admin_roles r ON r.id = ur.admin_role_id
       WHERE u.id = $1
       GROUP BY u.id
       LIMIT 1`,
      [id]
    );
    return rows.rows[0] ? mapAdminUser(rows.rows[0]) : null;
  }
  if (moduleKey === 'roles') {
    const rows = await pgPool!.query(`SELECT * FROM admin_roles WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapRole(rows.rows[0]) : null;
  }
  if (moduleKey === 'sessions') {
    const rows = await pgPool!.query(
      `SELECT s.*, u.username FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_user_id WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    return rows.rows[0] ? mapAdminSession(rows.rows[0]) : null;
  }
  if (moduleKey === 'contents') {
    const rows = await pgPool!.query(`SELECT * FROM admin_contents WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapContent(rows.rows[0]) : null;
  }
  if (moduleKey === 'templates') {
    const rows = await pgPool!.query(`SELECT * FROM route_templates WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapTemplate(rows.rows[0]) : null;
  }
  if (moduleKey === 'communityPosts') {
    const rows = await pgPool!.query(
      `SELECT p.*, COALESCE(a.display_name, p.user_id) AS author
       FROM community_posts p
       LEFT JOIN auth_identities a ON a.user_id = p.user_id
       WHERE p.id = $1 LIMIT 1`,
      [id]
    );
    return rows.rows[0] ? mapCommunityPost(rows.rows[0]) : null;
  }
  if (moduleKey === 'comments') {
    const rows = await pgPool!.query(
      `SELECT c.*, COALESCE(a.display_name, c.user_id) AS author, p.title AS post_title
       FROM community_comments c
       LEFT JOIN community_posts p ON p.id = c.post_id
       LEFT JOIN auth_identities a ON a.user_id = c.user_id
       WHERE c.id = $1 LIMIT 1`,
      [id]
    );
    return rows.rows[0] ? mapCommunityComment(rows.rows[0]) : null;
  }
  if (moduleKey === 'reports') {
    const rows = await pgPool!.query(`SELECT * FROM community_reports WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapCommunityReport(rows.rows[0]) : null;
  }
  if (moduleKey === 'feedback') {
    const rows = await pgPool!.query(`SELECT * FROM user_feedback WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapUserFeedback(rows.rows[0]) : null;
  }
  if (moduleKey === 'assets') {
    const rows = await pgPool!.query(`SELECT * FROM user_assets WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapUserAsset(rows.rows[0]) : null;
  }
  if (moduleKey === 'shareRecords') {
    const rows = await pgPool!.query(`SELECT * FROM route_share_records WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapShareRecord(rows.rows[0]) : null;
  }
  if (moduleKey === 'auditLogs') {
    const rows = await pgPool!.query(`SELECT * FROM admin_audit_logs WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapAuditLog(rows.rows[0]) : null;
  }
  return null;
}

export async function createAdminRecord(moduleKey: AdminModuleKey, payload: Record<string, unknown>, actorId: string | null = null): Promise<Record<string, unknown>> {
  requireDb();
  if (moduleKey === 'users') {
    const normalized = normalizeAdminUserPayload(payload);
    if (!normalized.passwordHash) throw new Error('admin_password_too_weak');
    const roles = normalized.roles as string[] || [];
    await resolveAdminRoleIds(roles);
    const id = newId('admin-user');
    await pgPool!.query(
      `INSERT INTO admin_users (id, username, password_hash, display_name, phone, email, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        normalized.username,
        normalized.passwordHash,
        normalized.name,
        normalized.phone || null,
        normalized.email || null,
        normalized.status,
        actorId,
      ]
    );
    await setAdminUserRoles(id, roles, actorId);
    await writeAdminAudit(actorId, 'create', moduleKey, id, payload);
    return (await getAdminRecordById(moduleKey, id)) || {};
  }
  if (moduleKey === 'roles') {
    const normalized = normalizeAdminRolePayload(payload);
    const id = newId('admin-role');
    await pgPool!.query(
      `INSERT INTO admin_roles (id, code, name, description, permission_matrix, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        id,
        normalized.code,
        normalized.name,
        normalized.desc,
        JSON.stringify(normalized.permissionMatrix || {}),
        normalized.isActive !== false,
      ]
    );
    await writeAdminAudit(actorId, 'create', moduleKey, id, payload);
    return (await getAdminRecordById(moduleKey, id)) || {};
  }
  if (moduleKey === 'contents') {
    const normalized = normalizeContentPayload(payload);
    const id = newId('content');
    await pgPool!.query(
      `INSERT INTO admin_contents (id, content_key, content_type, title, summary, body_json, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        id,
        normalized.key,
        normalized.type,
        normalized.title,
        normalized.summary,
        JSON.stringify({ body: normalized.body }),
        normalized.status,
        normalized.sortOrder,
        actorId,
      ]
    );
    await writeAdminAudit(actorId, 'create', moduleKey, id, payload);
    return (await getAdminRecordById(moduleKey, id)) || {};
  }
  if (moduleKey === 'templates') {
    const normalized = normalizeTemplatePayload(payload);
    const id = newId('route-template');
    await pgPool!.query(
      `INSERT INTO route_templates
       (id, template_code, title, title_en, category, shape_type, distance_km, preview_payload, generation_payload, is_featured, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12)`,
      [
        id,
        normalized.code,
        normalized.name,
        normalized.titleEn,
        normalized.category,
        normalized.shapeType,
        normalized.distanceKm,
        JSON.stringify(normalized.previewPayload),
        JSON.stringify(normalized.generationPayload),
        normalized.isFeatured,
        normalized.isActive,
        normalized.sortOrder,
      ]
    );
    await writeAdminAudit(actorId, 'create', moduleKey, id, payload);
    return (await getAdminRecordById(moduleKey, id)) || {};
  }
  throw new Error('invalid_admin_module');
}

export async function updateAdminRecord(moduleKey: AdminModuleKey, id: string, payload: Record<string, unknown>, actorId: string | null = null): Promise<Record<string, unknown> | null> {
  requireDb();
  if (moduleKey === 'users') {
    const normalized = normalizeAdminUserPayload(payload, true);
    if (id === actorId && normalized.status && normalized.status !== 'active') {
      throw new Error('admin_cannot_disable_self');
    }
    if (id === actorId && Array.isArray(normalized.roles)) {
      throw new Error('admin_cannot_change_self_roles');
    }
    await pgPool!.query(
      `UPDATE admin_users
       SET username = COALESCE($2, username),
           display_name = COALESCE($3, display_name),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           status = COALESCE($6, status),
           password_hash = COALESCE($7, password_hash),
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        normalized.username || null,
        normalized.name || null,
        hasField(payload, 'phone') ? normalized.phone : null,
        hasField(payload, 'email') ? normalized.email : null,
        normalized.status || null,
        normalized.passwordHash || null,
      ]
    );
    if (Array.isArray(normalized.roles)) await setAdminUserRoles(id, normalized.roles, actorId);
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'roles') {
    const normalized = normalizeAdminRolePayload(payload, true);
    const currentCode = await getAdminRoleCode(id);
    if (currentCode === 'super_admin') {
      const nextPermissionMatrix = normalized.permissionMatrix as Record<string, boolean> | undefined;
      if (normalized.code && normalized.code !== 'super_admin') {
        throw new Error('admin_cannot_modify_super_admin_role');
      }
      if (normalized.isActive === false) {
        throw new Error('admin_cannot_modify_super_admin_role');
      }
      if (nextPermissionMatrix && nextPermissionMatrix['*'] !== true) {
        throw new Error('admin_cannot_modify_super_admin_role');
      }
    }
    await pgPool!.query(
      `UPDATE admin_roles
       SET code = COALESCE($2, code),
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           permission_matrix = COALESCE($5::jsonb, permission_matrix),
           is_active = COALESCE($6::boolean, is_active),
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        normalized.code || null,
        normalized.name || null,
        hasField(payload, 'desc') ? normalized.desc : null,
        normalized.permissionMatrix ? JSON.stringify(normalized.permissionMatrix) : null,
        normalized.isActive === undefined ? null : normalized.isActive,
      ]
    );
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'sessions') {
    await pgPool!.query(
      `UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1`,
      [id]
    );
    await writeAdminAudit(actorId, 'revoke', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'contents') {
    const normalized = normalizeContentPayload(payload, true);
    await pgPool!.query(
      `UPDATE admin_contents
       SET content_key = COALESCE($2, content_key),
           content_type = COALESCE($3, content_type),
           title = COALESCE($4, title),
           summary = COALESCE($5, summary),
           body_json = COALESCE($6::jsonb, body_json),
           status = COALESCE($7, status),
           sort_order = COALESCE($8, sort_order),
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        normalized.key || null,
        normalized.type || null,
        normalized.title || null,
        hasField(payload, 'summary') ? normalized.summary : null,
        hasField(payload, 'body') ? JSON.stringify({ body: normalized.body }) : null,
        normalized.status || null,
        hasField(payload, 'sortOrder') ? normalized.sortOrder : null,
      ]
    );
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'templates') {
    const normalized = normalizeTemplatePayload(payload, true);
    await pgPool!.query(
      `UPDATE route_templates
       SET template_code = COALESCE($2, template_code),
           title = COALESCE($3, title),
           title_en = COALESCE($4, title_en),
           category = COALESCE($5, category),
           shape_type = COALESCE($6, shape_type),
           distance_km = COALESCE($7, distance_km),
           preview_payload = COALESCE($8::jsonb, preview_payload),
           generation_payload = COALESCE($9::jsonb, generation_payload),
           is_featured = COALESCE($10, is_featured),
           is_active = COALESCE($11, is_active),
           sort_order = COALESCE($12, sort_order),
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        normalized.code || null,
        normalized.name || null,
        hasField(payload, 'titleEn') ? normalized.titleEn : null,
        normalized.category || null,
        normalized.shapeType || null,
        hasField(payload, 'distanceKm') ? normalized.distanceKm : null,
        hasField(payload, 'previewPayload') ? JSON.stringify(normalized.previewPayload || {}) : null,
        hasField(payload, 'generationPayload') ? JSON.stringify(normalized.generationPayload || {}) : null,
        hasField(payload, 'isFeatured') ? normalized.isFeatured : null,
        hasField(payload, 'isActive') ? normalized.isActive : null,
        hasField(payload, 'sortOrder') ? normalized.sortOrder : null,
      ]
    );
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'communityPosts') {
    const reviewStatus = payload.reviewStatus ? String(payload.reviewStatus) : null;
    const status = reviewStatus === 'approved'
      ? 'published'
      : reviewStatus === 'rejected'
        ? 'hidden'
        : (payload.status ? String(payload.status) : null);
    await pgPool!.query(
      `UPDATE community_posts
       SET status = COALESCE($2, status),
           review_status = COALESCE($3, review_status),
           reject_reason = COALESCE($4, reject_reason),
           reviewed_by = $5,
           reviewed_at = CASE WHEN $3::text IS NULL THEN reviewed_at ELSE NOW() END,
           published_at = CASE WHEN $3 = 'approved' THEN COALESCE(published_at, NOW()) ELSE published_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, status, reviewStatus, hasField(payload, 'rejectReason') ? String(payload.rejectReason || '') : null, actorId]
    );
    await writeAdminAudit(actorId, 'review', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'comments') {
    const nextStatus = payload.status ? String(payload.status) : null;
    const current = await pgPool!.query(`SELECT post_id, status FROM community_comments WHERE id = $1 LIMIT 1`, [id]);
    if (!current.rows[0]) return null;
    await pgPool!.query(
      `UPDATE community_comments
       SET status = COALESCE($2, status),
           updated_at = NOW()
       WHERE id = $1`,
      [id, nextStatus]
    );
    const oldStatus = String(current.rows[0].status || '');
    if (nextStatus && oldStatus !== nextStatus) {
      const delta = oldStatus === 'published' && nextStatus !== 'published'
        ? -1
        : oldStatus !== 'published' && nextStatus === 'published'
          ? 1
          : 0;
      if (delta !== 0) {
        await pgPool!.query(
          `UPDATE community_posts
           SET comment_count = GREATEST(comment_count + $2, 0), updated_at = NOW()
           WHERE id = $1`,
          [current.rows[0].post_id, delta]
        );
      }
    }
    await writeAdminAudit(actorId, 'moderate', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'reports') {
    const status = payload.status ? String(payload.status) : null;
    const hidePost = payload.hidePost === true;
    const actionTaken = String(payload.actionTaken || (hidePost ? 'hide_post' : ''));
    await pgPool!.query(
      `UPDATE community_reports
       SET status = COALESCE($2, status),
           action_taken = $3,
           handled_by = CASE WHEN $2 = 'closed' THEN $4 ELSE handled_by END,
           handled_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE handled_at END
       WHERE id = $1`,
      [id, status, actionTaken, actorId]
    );
    if (hidePost) {
      await pgPool!.query(
        `UPDATE community_posts
         SET status = 'hidden', updated_at = NOW(), reviewed_by = $2, reviewed_at = NOW()
         WHERE id = (SELECT post_id FROM community_reports WHERE id = $1)`,
        [id, actorId]
      );
    }
    await writeAdminAudit(actorId, 'handle', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'feedback') {
    await pgPool!.query(
      `UPDATE user_feedback
       SET status = COALESCE($2, status),
           handled_by = CASE WHEN $2 = 'closed' THEN $3 ELSE handled_by END,
           handled_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE handled_at END
       WHERE id = $1`,
      [id, payload.status ? String(payload.status) : null, actorId]
    );
    await writeAdminAudit(actorId, 'handle', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'auditLogs') {
    throw new Error('admin_audit_readonly');
  }
  throw new Error('invalid_admin_module');
}

export async function removeAdminRecord(moduleKey: AdminModuleKey, id: string, actorId: string | null = null): Promise<boolean> {
  requireDb();
  let result: { rowCount: number | null };
  if (moduleKey === 'users') {
    if (id === actorId) {
      throw new Error('admin_cannot_disable_self');
    }
    result = await pgPool!.query(
      `UPDATE admin_users SET status = 'disabled', deactivated_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'roles') {
    const currentCode = await getAdminRoleCode(id);
    if (currentCode === 'super_admin') {
      throw new Error('admin_cannot_modify_super_admin_role');
    }
    result = await pgPool!.query(
      `UPDATE admin_roles SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'sessions') {
    result = await pgPool!.query(
      `UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'contents') {
    result = await pgPool!.query(
      `UPDATE admin_contents SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'templates') {
    result = await pgPool!.query(
      `UPDATE route_templates SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'communityPosts') {
    result = await pgPool!.query(
      `UPDATE community_posts SET status = 'hidden', updated_at = NOW(), reviewed_by = $2, reviewed_at = NOW() WHERE id = $1`,
      [id, actorId]
    );
  } else if (moduleKey === 'comments') {
    const current = await pgPool!.query(`SELECT post_id, status FROM community_comments WHERE id = $1 LIMIT 1`, [id]);
    result = await pgPool!.query(
      `UPDATE community_comments SET status = 'hidden', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    if (current.rows[0]?.status === 'published' && Number(result.rowCount || 0) > 0) {
      await pgPool!.query(
        `UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW() WHERE id = $1`,
        [current.rows[0].post_id]
      );
    }
  } else if (moduleKey === 'reports') {
    result = await pgPool!.query(
      `UPDATE community_reports SET status = 'closed', handled_by = $2, handled_at = NOW(), action_taken = COALESCE(action_taken, 'closed') WHERE id = $1`,
      [id, actorId]
    );
  } else if (moduleKey === 'feedback') {
    result = await pgPool!.query(
      `UPDATE user_feedback SET status = 'closed', handled_by = $2, handled_at = NOW() WHERE id = $1`,
      [id, actorId]
    );
  } else if (moduleKey === 'auditLogs') {
    throw new Error('admin_audit_readonly');
  } else {
    throw new Error('invalid_admin_module');
  }
  const removed = Number(result.rowCount || 0) > 0;
  if (removed) await writeAdminAudit(actorId, 'soft_delete', moduleKey, id, {});
  return removed;
}

async function setAdminUserRoles(adminUserId: string, roles: string[], actorId: string | null): Promise<void> {
  const normalizedRoles = Array.from(new Set(roles.map((code) => String(code || '').trim()).filter(Boolean)));
  const roleMap = await resolveAdminRoleIds(normalizedRoles);
  await pgPool!.query(`DELETE FROM admin_user_roles WHERE admin_user_id = $1`, [adminUserId]);
  for (const code of normalizedRoles) {
    await pgPool!.query(
      `INSERT INTO admin_user_roles (id, admin_user_id, admin_role_id, assigned_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [newId('admin-user-role'), adminUserId, roleMap.get(code), actorId]
    );
  }
}

async function writeAdminAudit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  diff: Record<string, unknown>
): Promise<void> {
  try {
    await pgPool!.query(
      `INSERT INTO admin_audit_logs (id, actor_admin_id, action, target_type, target_id, request_path, request_method, diff)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [newId('audit'), actorId, action, targetType, targetId, `/api/admin/${targetType}`, action.toUpperCase(), JSON.stringify(sanitizeAuditDiff(diff))]
    );
  } catch (err) {
    logger.warn('admin_audit_skipped', { message: (err as Error).message, targetType, targetId, action });
  }
}
