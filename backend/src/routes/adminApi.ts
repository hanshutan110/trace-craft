import { Router, type NextFunction, type Request, type Response } from 'express';
import { bearerToken, cookieOptions, errorPayload, readCookie, successPayload } from './common';
import {
  authenticateAdmin,
  createAdminRecord,
  listAdminModule,
  removeAdminRecord,
  updateAdminRecord,
  verifyAdminToken,
  type AdminActor,
} from '../services/adminService';
import type { AdminModuleKey } from '../../../shared/admin';

const router = Router();

const allowedModules = new Set(['users', 'contents', 'templates', 'roleLibrary']);
const WRITE_ROLES = new Set(['super_admin']);
const OPERATOR_WRITE_MODULES = new Set(['contents', 'templates']);

function normalizeModule(value: unknown): AdminModuleKey {
  const moduleKey = String(value || '');
  if (!allowedModules.has(moduleKey)) {
    throw new Error('invalid_admin_module');
  }
  return moduleKey as AdminModuleKey;
}

function getAdminActor(req: Request): ReturnType<typeof verifyAdminToken> {
  const token = bearerToken(req) || readCookie(req, 'tc_admin_token');
  return token ? verifyAdminToken(token) : null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void | Response {
  const actor = getAdminActor(req);
  if (!actor) {
    return res.status(401).json(errorPayload('admin not authenticated', 'admin_auth_required', 401));
  }
  (req as Request & { adminActor?: AdminActor }).adminActor = actor;
  return next();
}

function canAccess(actor: AdminActor, moduleKey: AdminModuleKey, action: 'read' | 'write'): boolean {
  if (actor.roles.includes('super_admin')) return true;
  if (action === 'read') {
    return actor.roles.some((role) => role === 'operator' || role === 'content_viewer');
  }
  if (actor.roles.includes('operator') && OPERATOR_WRITE_MODULES.has(moduleKey)) return true;
  return actor.roles.some((role) => WRITE_ROLES.has(role));
}

function requireAdminAccess(moduleKey: AdminModuleKey, action: 'read' | 'write', req: Request, res: Response): AdminActor | null {
  const actor = currentAdmin(req);
  if (!actor || !canAccess(actor, moduleKey, action)) {
    res.status(403).json(errorPayload('admin permission denied', 'admin_permission_denied', 403));
    return null;
  }
  return actor;
}

function currentAdmin(req: Request): AdminActor | null {
  return (req as Request & { adminActor?: AdminActor }).adminActor || null;
}

router.post('/admin/auth/login', async (req: Request, res: Response) => {
  try {
    const result = await authenticateAdmin(String(req.body?.username || ''), String(req.body?.password || ''));
    if (!result) {
      return res.status(401).json(errorPayload('invalid admin credentials', 'admin_auth_failed', 401));
    }
    res.cookie('tc_admin_token', result.token, cookieOptions(12 * 60 * 60 * 1000));
    return res.json(successPayload({ admin: result.admin }));
  } catch (err) {
    console.error('[admin:login]', err);
    return res.status(500).json(errorPayload('admin login failed', 'admin_login_failed', 500));
  }
});

router.get('/admin/auth/me', async (req: Request, res: Response) => {
  const admin = getAdminActor(req);
  if (!admin) {
    return res.status(401).json(errorPayload('admin not authenticated', 'admin_auth_required', 401));
  }
  return res.json(successPayload({ admin }));
});

router.get('/admin/:moduleKey', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (!requireAdminAccess(moduleKey, 'read', req, res)) return;
    const result = await listAdminModule(moduleKey, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      keyword: typeof req.query.keyword === 'string' ? req.query.keyword : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      roleCode: typeof req.query.roleCode === 'string' ? req.query.roleCode : undefined,
    });
    return res.json(successPayload({ ...result }));
  } catch (err) {
    console.error('[admin:list]', err);
    return res.status(400).json(errorPayload('admin list failed', 'admin_list_failed', 400));
  }
});

router.post('/admin/:moduleKey', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (moduleKey === 'roleLibrary') {
      return res.status(400).json(errorPayload('role library is read only', 'role_readonly', 400));
    }
    const actor = requireAdminAccess(moduleKey, 'write', req, res);
    if (!actor) return;
    const record = await createAdminRecord(moduleKey, req.body || {}, actor?.id || null);
    return res.json(successPayload({ record }));
  } catch (err) {
    console.error('[admin:create]', err);
    return res.status(500).json(errorPayload('admin create failed', 'admin_create_failed', 500));
  }
});

router.put('/admin/:moduleKey/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (moduleKey === 'roleLibrary') {
      return res.status(400).json(errorPayload('role library is read only', 'role_readonly', 400));
    }
    const actor = requireAdminAccess(moduleKey, 'write', req, res);
    if (!actor) return;
    const record = await updateAdminRecord(moduleKey, String(req.params.id), req.body || {}, actor?.id || null);
    if (!record) {
      return res.status(404).json(errorPayload('record not found', 'admin_not_found', 404));
    }
    return res.json(successPayload({ record }));
  } catch (err) {
    console.error('[admin:update]', err);
    return res.status(500).json(errorPayload('admin update failed', 'admin_update_failed', 500));
  }
});

router.delete('/admin/:moduleKey/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (moduleKey === 'roleLibrary') {
      return res.status(400).json(errorPayload('role library is read only', 'role_readonly', 400));
    }
    const actor = requireAdminAccess(moduleKey, 'write', req, res);
    if (!actor) return;
    const removed = await removeAdminRecord(moduleKey, String(req.params.id), actor?.id || null);
    return res.json(successPayload({ removed }));
  } catch (err) {
    console.error('[admin:remove]', err);
    return res.status(500).json(errorPayload('admin remove failed', 'admin_remove_failed', 500));
  }
});

export default router;
