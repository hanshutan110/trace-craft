/**
 * 路线相关 API 路由
 *
 * 包含：创建路线（图片/模板）、查询路线、调整距离、重映射起终点、路线列表
 */

import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  createRouteFromImage,
  createRouteFromTemplate,
  adjustRouteDistance,
  rebaseRoute,
  listUserRuns,
} from '../services/routeService';
import {
  requireAuth,
  successPayload,
  errorPayload,
  parseJsonField,
  toOptionalNumber,
  asPositiveInt,
} from './common';
import { getRouteRecord } from '../services/storage';

const router = Router();
const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('unsupported_image_type'));
  },
});

function uploadImage(req: Request, res: Response, next: NextFunction): void {
  upload.single('image')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(errorPayload('image file too large', 'image_too_large', 413, {
        maxBytes: IMAGE_UPLOAD_MAX_BYTES,
      }));
      return;
    }
    if ((err as Error).message === 'unsupported_image_type') {
      res.status(415).json(errorPayload('unsupported image type', 'unsupported_image_type', 415, {
        allowedTypes: Array.from(ALLOWED_IMAGE_MIME_TYPES),
      }));
      return;
    }
    res.status(400).json(errorPayload('invalid image upload', 'invalid_image_upload', 400));
  });
}

// 核心接口：上传图片生成路线
router.post('/routes', requireAuth, uploadImage, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json(errorPayload('missing image file', 'missing_image', 400));
      return;
    }
    const body = { ...req.body };
    const route = await createRouteFromImage({
      userId: req.userId ?? null,
      filename: req.file.originalname || 'upload',
      buffer: req.file.buffer,
      provider: body.provider,
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: parseJsonField(body.startPoint),
      endPoint: parseJsonField(body.endPoint),
      currentAccuracy: toOptionalNumber(body.currentAccuracy),
    });
    res.json(successPayload({
      route,
      traceId: req.traceId,
      currentState: 'ready',
      nextAction: 'preview_route',
      sessionId: null,
      version: route?.version || 1,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('route generation failed', 'route_generation_failed', 500));
  }
});

// 基础模板生成路线
router.post('/routes/from-template', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const route = await createRouteFromTemplate({
      userId: req.userId ?? null,
      shapeType: typeof body.shapeType === 'string' ? body.shapeType : 'star',
      provider: body.provider,
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: body.startPoint,
      currentAccuracy: toOptionalNumber(body.currentAccuracy),
    });
    res.json(successPayload({
      route,
      traceId: req.traceId,
      currentState: 'ready',
      nextAction: 'preview_route',
      sessionId: null,
      version: route?.version || 1,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('template route generation failed', 'template_route_generation_failed', 500));
  }
});

// 查询单条路线详情
router.get('/routes/:routeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const routeId = req.params.routeId as string;
    const route = await getRouteRecord(routeId, req.userId ?? null);
    if (!route) {
      res.status(404).json(errorPayload('route not found', 'route_not_found', 404));
      return;
    }
    res.json(successPayload({ route, traceId: req.traceId }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('fetch route failed', 'route_fetch_failed', 500));
  }
});

// 调整路线距离
router.put('/routes/:routeId/adjust', requireAuth, async (req: Request, res: Response) => {
  try {
    const routeId = req.params.routeId as string;
    const targetKm = Number(req.body.targetKm);
    const route = await adjustRouteDistance(routeId, targetKm, req.userId ?? null);
    if (!route) {
      res.status(404).json(errorPayload('route not found or invalid target', 'route_not_found', 404));
      return;
    }
    res.json(successPayload({
      route,
      routeId,
      version: route.version,
      updatedAt: route.updatedAt,
      traceId: req.traceId,
      nextAction: 'start_run',
    }));
  } catch (err) {
    console.error(err);
    if ((err as Error).message === 'route_version_conflict') {
      res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
      return;
    }
    res.status(500).json(errorPayload('adjust failed', 'adjust_failed', 500));
  }
});

// 重映射路线起终点
router.put('/routes/:routeId/rebase', requireAuth, async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params as { routeId: string };
    const { startPoint, endPoint, strategy } = req.body || {};
    const route = await rebaseRoute(routeId, startPoint, endPoint, strategy, req.userId ?? null);
    if (!route) {
      res.status(404).json(errorPayload('route not found', 'route_not_found', 404));
      return;
    }
    res.json(successPayload({
      route,
      routeId,
      version: route.version,
      updatedAt: route.updatedAt,
      traceId: req.traceId,
      nextAction: 'start_run',
    }));
  } catch (err) {
    console.error(err);
    if ((err as Error).message === 'route_version_conflict') {
      res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
      return;
    }
    res.status(500).json(errorPayload('rebase failed', 'rebase_failed', 500));
  }
});

// 查询当前用户的路线列表
router.get('/runs', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = asPositiveInt(req.query.page, 1, 1, 200);
    const limit = asPositiveInt(req.query.limit, 20, 1, 100);
    const payload = await listUserRuns(req.userId ?? null, {
      page,
      limit,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json(successPayload({
      userId: req.userId,
      ...payload,
      traceId: req.traceId,
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(errorPayload('list runs failed', 'list_runs_failed', 500));
  }
});

export default router;
