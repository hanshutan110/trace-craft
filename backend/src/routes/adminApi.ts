import { Router, type NextFunction, type Request, type Response } from 'express';
import { errorPayload, successPayload } from './common';
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

function normalizeModule(value: unknown): AdminModuleKey {
  const moduleKey = String(value || '');
  if (!allowedModules.has(moduleKey)) {
    throw new Error('invalid_admin_module');
  }
  return moduleKey as AdminModuleKey;
}

function getAdminActor(req: Request): ReturnType<typeof verifyAdminToken> {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
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

function currentAdmin(req: Request): AdminActor | null {
  return (req as Request & { adminActor?: AdminActor }).adminActor || null;
}

router.post('/admin/auth/login', async (req: Request, res: Response) => {
  try {
    const result = await authenticateAdmin(String(req.body?.username || ''), String(req.body?.password || ''));
    if (!result) {
      return res.status(401).json(errorPayload('invalid admin credentials', 'admin_auth_failed', 401));
    }
    return res.json(successPayload({ ...result }));
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
    const actor = currentAdmin(req);
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
    const actor = currentAdmin(req);
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
    const actor = currentAdmin(req);
    const removed = await removeAdminRecord(moduleKey, String(req.params.id), actor?.id || null);
    return res.json(successPayload({ removed }));
  } catch (err) {
    console.error('[admin:remove]', err);
    return res.status(500).json(errorPayload('admin remove failed', 'admin_remove_failed', 500));
  }
});

export default router;
