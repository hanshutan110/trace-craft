import { pgPool } from './postgres-storage';

function newId(prefix: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function requireDb(): void {
  if (!pgPool) throw new Error('postgres_not_configured');
}

function toIso(value: unknown): string {
  return value ? new Date(value as string | Date).toISOString() : new Date().toISOString();
}

function safeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export async function listAdminModule(moduleKey: string): Promise<Record<string, unknown>[]> {
  requireDb();
  if (moduleKey === 'roleLibrary') {
    const rows = await pgPool!.query(`SELECT * FROM admin_roles WHERE is_active = TRUE ORDER BY code ASC`);
    return rows.rows.map((row) => ({
      code: row.code,
      name: row.name,
      desc: row.description || '',
    }));
  }
  if (moduleKey === 'users') {
    const rows = await pgPool!.query(
      `SELECT u.*, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
       FROM admin_users u
       LEFT JOIN admin_user_roles ur ON ur.admin_user_id = u.id
       LEFT JOIN admin_roles r ON r.id = ur.admin_role_id
       GROUP BY u.id
       ORDER BY u.updated_at DESC`
    );
    return rows.rows.map((row) => ({
      id: row.id,
      username: row.username,
      name: row.display_name,
      phone: row.phone || '',
      email: row.email || '',
      roles: row.roles || [],
      status: row.status,
      updatedAt: toIso(row.updated_at),
    }));
  }
  if (moduleKey === 'contents') {
    const rows = await pgPool!.query(`SELECT * FROM admin_contents ORDER BY sort_order ASC, updated_at DESC`);
    return rows.rows.map((row) => {
      const body = safeJson(row.body_json);
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
    });
  }
  if (moduleKey === 'templates') {
    const rows = await pgPool!.query(`SELECT * FROM admin_templates ORDER BY sort_order ASC, updated_at DESC`);
    return rows.rows.map((row) => ({
      id: row.id,
      code: row.template_code,
      name: row.template_name,
      category: row.category,
      providerHint: row.provider_hint || '',
      payload: JSON.stringify(safeJson(row.template_payload), null, 2),
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
      version: row.version,
      sortOrder: row.sort_order,
      updatedAt: toIso(row.updated_at),
      description: row.description || '',
    }));
  }
  throw new Error('invalid_admin_module');
}

export async function createAdminRecord(moduleKey: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  requireDb();
  if (moduleKey === 'users') {
    const id = newId('admin-user');
    await pgPool!.query(
      `INSERT INTO admin_users (id, username, password_hash, display_name, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        String(payload.username || ''),
        'password_login_disabled_until_admin_auth_ready',
        String(payload.name || payload.username || ''),
        payload.phone ? String(payload.phone) : null,
        payload.email ? String(payload.email) : null,
        String(payload.status || 'active'),
      ]
    );
    await setAdminUserRoles(id, Array.isArray(payload.roles) ? payload.roles.map(String) : []);
    return (await listAdminModule('users')).find((item) => item.id === id) || {};
  }
  if (moduleKey === 'contents') {
    const id = newId('content');
    await pgPool!.query(
      `INSERT INTO admin_contents (id, content_key, content_type, title, summary, body_json, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        id,
        String(payload.key || ''),
        String(payload.type || 'announcement'),
        String(payload.title || ''),
        String(payload.summary || ''),
        JSON.stringify({ body: String(payload.body || '') }),
        String(payload.status || 'draft'),
        Number(payload.sortOrder || 0),
      ]
    );
    return (await listAdminModule('contents')).find((item) => item.id === id) || {};
  }
  if (moduleKey === 'templates') {
    const id = newId('admin-template');
    await pgPool!.query(
      `INSERT INTO admin_templates
       (id, template_code, template_name, category, provider_hint, template_payload, version, is_default, is_active, sort_order, description)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
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
      ]
    );
    return (await listAdminModule('templates')).find((item) => item.id === id) || {};
  }
  throw new Error('invalid_admin_module');
}

export async function updateAdminRecord(moduleKey: string, id: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
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
    if (Array.isArray(payload.roles)) await setAdminUserRoles(id, payload.roles.map(String));
    return (await listAdminModule('users')).find((item) => item.id === id) || null;
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
    return (await listAdminModule('contents')).find((item) => item.id === id) || null;
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
    return (await listAdminModule('templates')).find((item) => item.id === id) || null;
  }
  throw new Error('invalid_admin_module');
}

export async function removeAdminRecord(moduleKey: string, id: string): Promise<boolean> {
  requireDb();
  const table = moduleKey === 'users' ? 'admin_users' : moduleKey === 'contents' ? 'admin_contents' : moduleKey === 'templates' ? 'admin_templates' : '';
  if (!table) throw new Error('invalid_admin_module');
  const result = await pgPool!.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return Number(result.rowCount || 0) > 0;
}

async function setAdminUserRoles(adminUserId: string, roles: string[]): Promise<void> {
  await pgPool!.query(`DELETE FROM admin_user_roles WHERE admin_user_id = $1`, [adminUserId]);
  for (const code of roles) {
    const role = await pgPool!.query(`SELECT id FROM admin_roles WHERE code = $1 LIMIT 1`, [code]);
    if (role.rows[0]) {
      await pgPool!.query(
        `INSERT INTO admin_user_roles (id, admin_user_id, admin_role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [newId('admin-role'), adminUserId, role.rows[0].id]
      );
    }
  }
}
