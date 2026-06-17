import { Router, type Request, type Response } from 'express';
import { errorPayload, successPayload } from './common';
import {
  createAdminRecord,
  listAdminModule,
  removeAdminRecord,
  updateAdminRecord,
} from '../services/adminService';

const router = Router();

const allowedModules = new Set(['users', 'contents', 'templates', 'roleLibrary']);

function normalizeModule(value: unknown): string {
  const moduleKey = String(value || '');
  if (!allowedModules.has(moduleKey)) {
    throw new Error('invalid_admin_module');
  }
  return moduleKey;
}

router.get('/admin/:moduleKey', async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    const rows = await listAdminModule(moduleKey);
    res.json(successPayload({ rows }));
  } catch (err) {
    console.error('[admin:list]', err);
    res.status(400).json(errorPayload('admin list failed', 'admin_list_failed', 400));
  }
});

router.post('/admin/:moduleKey', async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (moduleKey === 'roleLibrary') {
      return res.status(400).json(errorPayload('role library is read only', 'role_readonly', 400));
    }
    const record = await createAdminRecord(moduleKey, req.body || {});
    return res.json(successPayload({ record }));
  } catch (err) {
    console.error('[admin:create]', err);
    return res.status(500).json(errorPayload('admin create failed', 'admin_create_failed', 500));
  }
});

router.put('/admin/:moduleKey/:id', async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (moduleKey === 'roleLibrary') {
      return res.status(400).json(errorPayload('role library is read only', 'role_readonly', 400));
    }
    const record = await updateAdminRecord(moduleKey, String(req.params.id), req.body || {});
    if (!record) {
      return res.status(404).json(errorPayload('record not found', 'admin_not_found', 404));
    }
    return res.json(successPayload({ record }));
  } catch (err) {
    console.error('[admin:update]', err);
    return res.status(500).json(errorPayload('admin update failed', 'admin_update_failed', 500));
  }
});

router.delete('/admin/:moduleKey/:id', async (req: Request, res: Response) => {
  try {
    const moduleKey = normalizeModule(req.params.moduleKey);
    if (moduleKey === 'roleLibrary') {
      return res.status(400).json(errorPayload('role library is read only', 'role_readonly', 400));
    }
    const removed = await removeAdminRecord(moduleKey, String(req.params.id));
    return res.json(successPayload({ removed }));
  } catch (err) {
    console.error('[admin:remove]', err);
    return res.status(500).json(errorPayload('admin remove failed', 'admin_remove_failed', 500));
  }
});

export default router;
