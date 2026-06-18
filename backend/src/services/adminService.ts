import crypto from 'crypto';
import type { AdminListParams, AdminListResult, AdminModuleKey, AdminProfile } from '../../../shared/admin';
import { pgPool } from './postgres-storage';
import { toIso } from '../utils/date';
import { newId } from '../utils/id';
import { safeJsonObject } from '../utils/json';

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
  const payload = Buffer.from(JSON.stringify({
    id: actor.id,
    username: actor.username,
    displayName: actor.displayName,
    roles: actor.roles,
    ts: Date.now(),
  })).toString('base64url');
  const secret = process.env.TRACECRAFT_ADMIN_TOKEN_SECRET || 'tracecraft-admin-dev-secret';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): AdminActor | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const secret = process.env.TRACECRAFT_ADMIN_TOKEN_SECRET || 'tracecraft-admin-dev-secret';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminActor & { ts?: number };
    const ttlHours = Math.max(1, Number(process.env.TRACECRAFT_ADMIN_TOKEN_TTL_HOURS || 12));
    if (parsed.ts && Date.now() - parsed.ts > ttlHours * 60 * 60 * 1000) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      displayName: parsed.displayName,
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
    };
  } catch {
    return null;
  }
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
    name: row.template_name,
    category: row.category,
    providerHint: row.provider_hint || '',
    payload: JSON.stringify(safeJsonObject(row.template_payload), null, 2),
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    version: row.version,
    sortOrder: row.sort_order,
    updatedAt: toIso(row.updated_at),
    description: row.description || '',
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

export async function authenticateAdmin(username: string, password: string): Promise<{ token: string; admin: AdminActor } | null> {
  requireDb();
  if (!username || !password) return null;
  const admin = await queryActorByUsername(username);
  if (!admin) return null;
  const passwordRows = await pgPool!.query(`SELECT password_hash FROM admin_users WHERE id = $1 LIMIT 1`, [admin.id]);
  const passwordHash = String(passwordRows.rows[0]?.password_hash || '');
  if (!verifyAdminPassword(password, passwordHash)) return null;
  await pgPool!.query(`UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, [admin.id]);
  return { token: signToken(admin), admin };
}

function verifyAdminPassword(password: string, passwordHash: string): boolean {
  if (passwordHash.startsWith('sha256:')) {
    const [, salt, expected] = passwordHash.split(':');
    const actual = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
    if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected)) return false;
    return Boolean(expected) && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  }
  // MVP 兼容：现有种子账号仍是占位 hash 时，使用环境变量口令。
  if (passwordHash === 'password_login_disabled_until_admin_auth_ready') {
    return password === (process.env.TRACECRAFT_ADMIN_PASSWORD || 'admin123');
  }
  return false;
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
      rows: rows.rows.map((row) => ({ code: row.code, name: row.name, desc: row.description || '' })),
      total: rows.rowCount || 0,
      page: 1,
      limit: rows.rowCount || 0,
    };
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
        AND ($3::text IS NULL OR LOWER(template_code) LIKE $3 OR LOWER(template_name) LIKE $3 OR LOWER(COALESCE(description, '')) LIKE $3)`;
    const count = await pgPool!.query(`SELECT COUNT(*)::int AS total FROM admin_templates ${where}`, params.slice(0, 3));
    const rows = await pgPool!.query(
      `SELECT * FROM admin_templates ${where} ORDER BY sort_order ASC, updated_at DESC LIMIT $4 OFFSET $5`,
      params
    );
    return { rows: rows.rows.map(mapTemplate), total: Number(count.rows[0]?.total || 0), page, limit };
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
  if (moduleKey === 'contents') {
    const rows = await pgPool!.query(`SELECT * FROM admin_contents WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapContent(rows.rows[0]) : null;
  }
  if (moduleKey === 'templates') {
    const rows = await pgPool!.query(`SELECT * FROM admin_templates WHERE id = $1 LIMIT 1`, [id]);
    return rows.rows[0] ? mapTemplate(rows.rows[0]) : null;
  }
  return null;
}

export async function createAdminRecord(moduleKey: AdminModuleKey, payload: Record<string, unknown>, actorId: string | null = null): Promise<Record<string, unknown>> {
  requireDb();
  if (moduleKey === 'users') {
    const id = newId('admin-user');
    await pgPool!.query(
      `INSERT INTO admin_users (id, username, password_hash, display_name, phone, email, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        String(payload.username || ''),
        'password_login_disabled_until_admin_auth_ready',
        String(payload.name || payload.username || ''),
        payload.phone ? String(payload.phone) : null,
        payload.email ? String(payload.email) : null,
        String(payload.status || 'active'),
        actorId,
      ]
    );
    await setAdminUserRoles(id, Array.isArray(payload.roles) ? payload.roles.map(String) : [], actorId);
    await writeAdminAudit(actorId, 'create', moduleKey, id, payload);
    return (await getAdminRecordById(moduleKey, id)) || {};
  }
  if (moduleKey === 'contents') {
    const id = newId('content');
    await pgPool!.query(
      `INSERT INTO admin_contents (id, content_key, content_type, title, summary, body_json, status, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        id,
        String(payload.key || ''),
        String(payload.type || 'announcement'),
        String(payload.title || ''),
        String(payload.summary || ''),
        JSON.stringify({ body: String(payload.body || '') }),
        String(payload.status || 'draft'),
        Number(payload.sortOrder || 0),
        actorId,
      ]
    );
    await writeAdminAudit(actorId, 'create', moduleKey, id, payload);
    return (await getAdminRecordById(moduleKey, id)) || {};
  }
  if (moduleKey === 'templates') {
    const id = newId('admin-template');
    await pgPool!.query(
      `INSERT INTO admin_templates
       (id, template_code, template_name, category, provider_hint, template_payload, version, is_default, is_active, sort_order, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        String(payload.code || ''),
        String(payload.name || ''),
        String(payload.category || 'route'),
        String(payload.providerHint || 'amap'),
        typeof payload.payload === 'string' ? payload.payload : JSON.stringify(payload.payload || {}),
        Number(payload.version || 1),
        Boolean(payload.isDefault),
        payload.isActive !== false,
        Number(payload.sortOrder || 0),
        String(payload.description || ''),
        actorId,
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
    await pgPool!.query(
      `UPDATE admin_users
       SET username = COALESCE($2, username),
           display_name = COALESCE($3, display_name),
           phone = $4,
           email = $5,
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        payload.username ? String(payload.username) : null,
        payload.name ? String(payload.name) : null,
        payload.phone ? String(payload.phone) : null,
        payload.email ? String(payload.email) : null,
        payload.status ? String(payload.status) : null,
      ]
    );
    if (Array.isArray(payload.roles)) await setAdminUserRoles(id, payload.roles.map(String), actorId);
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'contents') {
    await pgPool!.query(
      `UPDATE admin_contents
       SET content_key = COALESCE($2, content_key),
           content_type = COALESCE($3, content_type),
           title = COALESCE($4, title),
           summary = $5,
           body_json = $6::jsonb,
           status = COALESCE($7, status),
           sort_order = $8,
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        payload.key ? String(payload.key) : null,
        payload.type ? String(payload.type) : null,
        payload.title ? String(payload.title) : null,
        payload.summary ? String(payload.summary) : '',
        JSON.stringify({ body: String(payload.body || '') }),
        payload.status ? String(payload.status) : null,
        Number(payload.sortOrder || 0),
      ]
    );
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  if (moduleKey === 'templates') {
    await pgPool!.query(
      `UPDATE admin_templates
       SET template_code = COALESCE($2, template_code),
           template_name = COALESCE($3, template_name),
           category = COALESCE($4, category),
           provider_hint = $5,
           template_payload = $6::jsonb,
           version = $7,
           is_default = $8,
           is_active = $9,
           sort_order = $10,
           description = $11,
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        payload.code ? String(payload.code) : null,
        payload.name ? String(payload.name) : null,
        payload.category ? String(payload.category) : null,
        String(payload.providerHint || 'amap'),
        typeof payload.payload === 'string' ? payload.payload : JSON.stringify(payload.payload || {}),
        Number(payload.version || 1),
        Boolean(payload.isDefault),
        payload.isActive !== false,
        Number(payload.sortOrder || 0),
        String(payload.description || ''),
      ]
    );
    await writeAdminAudit(actorId, 'update', moduleKey, id, payload);
    return getAdminRecordById(moduleKey, id);
  }
  throw new Error('invalid_admin_module');
}

export async function removeAdminRecord(moduleKey: AdminModuleKey, id: string, actorId: string | null = null): Promise<boolean> {
  requireDb();
  let result: { rowCount: number | null };
  if (moduleKey === 'users') {
    result = await pgPool!.query(
      `UPDATE admin_users SET status = 'disabled', deactivated_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'contents') {
    result = await pgPool!.query(
      `UPDATE admin_contents SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else if (moduleKey === 'templates') {
    result = await pgPool!.query(
      `UPDATE admin_templates SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else {
    throw new Error('invalid_admin_module');
  }
  const removed = Number(result.rowCount || 0) > 0;
  if (removed) await writeAdminAudit(actorId, 'soft_delete', moduleKey, id, {});
  return removed;
}

async function setAdminUserRoles(adminUserId: string, roles: string[], actorId: string | null): Promise<void> {
  await pgPool!.query(`DELETE FROM admin_user_roles WHERE admin_user_id = $1`, [adminUserId]);
  for (const code of roles) {
    const role = await pgPool!.query(`SELECT id FROM admin_roles WHERE code = $1 LIMIT 1`, [code]);
    if (role.rows[0]) {
      await pgPool!.query(
        `INSERT INTO admin_user_roles (id, admin_user_id, admin_role_id, assigned_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [newId('admin-role'), adminUserId, role.rows[0].id, actorId]
      );
    }
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
      [newId('audit'), actorId, action, targetType, targetId, `/api/admin/${targetType}`, action.toUpperCase(), JSON.stringify(diff)]
    );
  } catch (err) {
    console.warn('[admin:audit_skipped]', (err as Error).message);
  }
}
