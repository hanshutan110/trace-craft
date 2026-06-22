import { Router, type NextFunction, type Request, type Response } from 'express';
import { bearerToken, cookieOptions, errorPayload, readCookie, successPayload } from './common';
import {
  authenticateAdmin,
  canAdminAccess,
  createAdminRecord,
  getAdminOverview,
  listAdminModule,
  removeAdminRecord,
  revokeAdminSession,
  updateAdminRecord,
  verifyAdminSession,
  type AdminActor,
} from '../services/adminService';
import { ADMIN_MODULES, type AdminModule, type AdminModuleKey } from '../../../shared/admin';
import { logger } from '../services/logger';
import { enqueueManualCleanup, runCleanupJob } from '../services/queueService';

const router = Router();

const allowedModules = new Set(['users', 'roles', 'sessions', 'contents', 'templates', 'communityPosts', 'comments', 'reports', 'feedback', 'assets', 'shareRecords', 'auditLogs', 'roleLibrary']);
const creatableModules = new Set(['users', 'roles', 'contents', 'templates']);
const readonlyModules = new Set(['assets', 'shareRecords', 'auditLogs', 'roleLibrary']);

async function attachAdminAccess(actor: AdminActor): Promise<AdminActor & { readableModules: AdminModule[]; writableModules: AdminModule[] }> {
  const readableModules: AdminModule[] = [];
  const writableModules: AdminModule[] = [];
  for (const moduleKey of ADMIN_MODULES) {
    if (await canAdminAccess(actor, moduleKey, 'read')) readableModules.push(moduleKey);
    if (!readonlyModules.has(moduleKey) && await canAdminAccess(actor, moduleKey, 'write')) {
      writableModules.push(moduleKey);
    }
  }
  return { ...actor, readableModules, writableModules };
}

function normalizeModule(value: unknown): AdminModuleKey {
  const moduleKey = String(value || '');
  if (!allowedModules.has(moduleKey)) {
    throw new Error('invalid_admin_module');
  }
  return moduleKey as AdminModuleKey;
}

async function getAdminActor(req: Request): Promise<AdminActor | null> {
  const token = bearerToken(req) || readCookie(req, 'tc_admin_token');
  return token ? verifyAdminSession(token) : null;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  const actor = await getAdminActor(req);
  if (!actor) {
    return res.status(401).json(errorPayload('admin not authenticated', 'admin_auth_required', 401));
  }
  (req as Request & { adminActor?: AdminActor }).adminActor = actor;
  return next();
}

async function requireAdminAccess(moduleKey: AdminModuleKey, action: 'read' | 'write', req: Request, res: Response): Promise<AdminActor | null> {
  const actor = currentAdmin(req);
  if (!actor || !(await canAdminAccess(actor, moduleKey, action))) {
    res.status(403).json(errorPayload('admin permission denied', 'admin_permission_denied', 403));
    return null;
  }
  return actor;
}

function currentAdmin(req: Request): AdminActor | null {
  return (req as Request & { adminActor?: AdminActor }).adminActor || null;
}

function adminErrorStatus(error: unknown, fallback: number): number {
  const message = error instanceof Error ? error.message : '';
  const dbCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  if (dbCode === '23505') return 409;
  if (message.startsWith('admin_validation_')) return 400;
  if (message === 'admin_password_too_weak' || message.startsWith('admin_cannot_')) return 400;
  return fallback;
}

function adminErrorCode(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  const dbCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  if (dbCode === '23505') return 'admin_duplicate_record';
  return message || fallback;
}

router.post('/admin/auth/login', async (req: Request, res: Response) => {
  try {
    const result = await authenticateAdmin(String(req.body?.username || ''), String(req.body?.password || ''), {
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    });
    if (!result) {
      return res.status(401).json(errorPayload('invalid admin credentials', 'admin_auth_failed', 401));
    }
    res.cookie('tc_admin_token', result.token, cookieOptions(12 * 60 * 60 * 1000));
    return res.json(successPayload({ admin: await attachAdminAccess(result.admin) }));
  } catch (err) {
    logger.error('admin_login_failed', err, { traceId: req.traceId });
    return res.status(500).json(errorPayload('admin login failed', 'admin_login_failed', 500));
  }
});

router.get('/admin/auth/me', async (req: Request, res: Response) => {
  const admin = await getAdminActor(req);
  if (!admin) {
    return res.status(401).json(errorPayload('admin not authenticated', 'admin_auth_required', 401));
  }
  return res.json(successPayload({ admin: await attachAdminAccess(admin) }));
});

router.post('/admin/auth/logout', async (req: Request, res: Response) => {
  try {
    const admin = await getAdminActor(req);
    if (admin) {
      await revokeAdminSession(admin);
    }
    res.clearCookie('tc_admin_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return res.json(successPayload({ loggedOut: true }));
  } catch (err) {
    logger.error('admin_logout_failed', err, { traceId: req.traceId });
    return res.status(500).json(errorPayload('admin logout failed', 'admin_logout_failed', 500));
  }
});

router.get('/admin/overview', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = currentAdmin(req);
    if (!actor) {
      return res.status(401).json(errorPayload('admin not authenticated', 'admin_auth_required', 401));
    }
    const admin = await attachAdminAccess(actor);
    const overview = await getAdminOverview(admin.readableModules);
    return res.json(successPayload({ overview }));
  } catch (err) {
    logger.error('admin_overview_failed', err, { traceId: req.traceId });
    return res.status(500).json(errorPayload('admin overview failed', 'admin_overview_failed', 500));
  }
});

router.post('/admin/maintenance/cleanup', requireAdmin, async (req: Request, res: Response) => {
  try {
    const actor = currentAdmin(req);
    if (!actor?.roles.includes('super_admin')) {
      return res.status(403).json(errorPayload('admin permission denied', 'admin_permission_denied', 403));
    }
    const type = req.body?.type === 'audit_logs' ? 'audit_logs' : 'location_events';
    const olderThanDays = Number.isFinite(Number(req.body?.olderThanDays)) ? Number(req.body.olderThanDays) : undefined;
    const jobId = await enqueueManualCleanup(type, olderThanDays);
    if (jobId) {
      return res.json(successPayload({ cleanup: { queued: true, jobId, type } }));
    }
    const result = await runCleanupJob({ type, olderThanDays: olderThanDays || 0 });
    return res.json(successPayload({ cleanup: { queued: false, type, ...result } }));
  } catch (err) {
    logger.error('admin_cleanup_failed', err, { traceId: req.traceId });
    return res.status(500).json(errorPayload('admin cleanup failed', 'admin_cleanup_failed', 500));
  }
});

router.get('/admin/:moduleKey', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (!(await requireAdminAccess(moduleKey, 'read', req, res))) return;
    const result = await listAdminModule(moduleKey, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      roleCode: typeof req.query.roleCode === 'string' ? req.query.roleCode : undefined,
      assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
      channel: typeof req.query.channel === 'string' ? req.query.channel : undefined,
    });
    return res.json(successPayload({ ...result }));
  } catch (err) {
    logger.error('admin_list_failed', err, { traceId: req.traceId, moduleKey: req.params.moduleKey });
    return res.status(400).json(errorPayload('admin list failed', 'admin_list_failed', 400));
  }
});

router.post('/admin/:moduleKey', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (!creatableModules.has(moduleKey)) {
      return res.status(400).json(errorPayload('admin module cannot create records', 'admin_create_not_supported', 400));
    }
    const actor = await requireAdminAccess(moduleKey, 'write', req, res);
    if (!actor) return;
    const record = await createAdminRecord(moduleKey, req.body || {}, actor?.id || null);
    return res.json(successPayload({ record }));
  } catch (err) {
    logger.error('admin_create_failed', err, { traceId: req.traceId, moduleKey: req.params.moduleKey });
    const status = adminErrorStatus(err, 500);
    const code = adminErrorCode(err, 'admin_create_failed');
    const message = status === 400 || status === 409 ? code : 'admin create failed';
    return res.status(status).json(errorPayload(message, code, status));
  }
});

router.put('/admin/:moduleKey/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (readonlyModules.has(moduleKey)) {
      return res.status(400).json(errorPayload('admin module is read only', 'admin_readonly', 400));
    }
    const actor = await requireAdminAccess(moduleKey, 'write', req, res);
    if (!actor) return;
    const record = await updateAdminRecord(moduleKey, String(req.params.id), req.body || {}, actor?.id || null);
    if (!record) {
      return res.status(404).json(errorPayload('record not found', 'admin_not_found', 404));
    }
    return res.json(successPayload({ record }));
  } catch (err) {
    logger.error('admin_update_failed', err, { traceId: req.traceId, moduleKey: req.params.moduleKey, id: req.params.id });
    const status = adminErrorStatus(err, 500);
    const code = adminErrorCode(err, 'admin_update_failed');
    const message = status === 400 || status === 409 ? code : 'admin update failed';
    return res.status(status).json(errorPayload(message, code, status));
  }
});

router.delete('/admin/:moduleKey/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (readonlyModules.has(moduleKey)) {
      return res.status(400).json(errorPayload('admin module is read only', 'admin_readonly', 400));
    }
    const actor = await requireAdminAccess(moduleKey, 'write', req, res);
    if (!actor) return;
    const removed = await removeAdminRecord(moduleKey, String(req.params.id), actor?.id || null);
    return res.json(successPayload({ removed }));
  } catch (err) {
    logger.error('admin_remove_failed', err, { traceId: req.traceId, moduleKey: req.params.moduleKey, id: req.params.id });
    const status = adminErrorStatus(err, 500);
    const code = adminErrorCode(err, 'admin_remove_failed');
    const message = status === 400 || status === 409 ? code : 'admin remove failed';
    return res.status(status).json(errorPayload(message, code, status));
  }
});

export default router;
