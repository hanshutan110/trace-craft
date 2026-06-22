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
import { cleanupUploadedFile, readUploadedFile, tempUploadStorage } from '../utils/uploadTemp';
import { logger } from '../services/logger';
import { validateBody, schemas } from '../middleware/validate';
import { createRedisAwareRateLimiter } from '../middleware/rateLimit';

const router = Router();
const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** 图片上传/路线生成端点限流：每个 IP 在 10 分钟内最多 15 次（CPU 密集型操作需要保护） */
const routeGenerationLimiter = createRedisAwareRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'route_generation_rate_limit', error: '路线生成过于频繁，请稍后再试', status: 429 },
});

const upload = multer({
  storage: tempUploadStorage('routes'),
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

function hasAllowedImageSignature(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isWebp;
}

// 核心接口：上传图片生成路线
router.post('/routes', requireAuth, routeGenerationLimiter, uploadImage, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json(errorPayload('missing image file', 'missing_image', 400));
      return;
    }
    const imageBuffer = await readUploadedFile(req.file);
    if (!hasAllowedImageSignature(imageBuffer)) {
      res.status(415).json(errorPayload('unsupported image signature', 'unsupported_image_signature', 415));
      return;
    }
    const body = { ...req.body };
    const route = await createRouteFromImage({
      userId: req.userId ?? null,
      filename: req.file.originalname || 'upload',
      buffer: imageBuffer,
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
    logger.error('route_image_create_failed', err, { traceId: req.traceId, userId: req.userId });
    if (['image_buffer_empty', 'image_has_no_visible_contour', 'image_contour_too_weak', 'image_contour_too_sparse'].includes((err as Error).message)) {
      res.status(400).json(errorPayload('image contour is too weak', 'image_contour_too_weak', 400));
      return;
    }
    if (['start_point_required', 'invalid_target_distance'].includes((err as Error).message)) {
      res.status(400).json(errorPayload((err as Error).message, (err as Error).message, 400));
      return;
    }
    res.status(500).json(errorPayload('route generation failed', 'route_generation_failed', 500));
  } finally {
    await cleanupUploadedFile(req.file).catch((error) => logger.warn('upload_cleanup_failed', { message: (error as Error).message }));
  }
});

// 基础模板生成路线
router.post('/routes/from-template', requireAuth, routeGenerationLimiter, validateBody(schemas.createTemplateRoute), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as { shapeType: string; templateId?: string | null; templateCode?: string | null; provider?: string; locale?: string; targetKm?: number; startPoint: unknown; currentAccuracy?: number | null };
    const route = await createRouteFromTemplate({
      userId: req.userId ?? null,
      shapeType: body.shapeType,
      templateId: body.templateId ?? null,
      templateCode: body.templateCode ?? null,
      provider: body.provider,
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: body.startPoint,
      currentAccuracy: body.currentAccuracy ?? null,
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
    logger.error('route_template_create_failed', err, { traceId: req.traceId, userId: req.userId });
    if (['start_point_required', 'invalid_target_distance'].includes((err as Error).message)) {
      res.status(400).json(errorPayload((err as Error).message, (err as Error).message, 400));
      return;
    }
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
    logger.error('route_fetch_failed', err, { traceId: req.traceId, routeId: req.params.routeId, userId: req.userId });
    res.status(500).json(errorPayload('fetch route failed', 'route_fetch_failed', 500));
  }
});

// 调整路线距离
router.put('/routes/:routeId/adjust', requireAuth, validateBody(schemas.adjustRoute), async (req: Request, res: Response) => {
  try {
    const routeId = req.params.routeId as string;
    const body = (req.validated?.body || req.body) as { targetKm: number };
    const route = await adjustRouteDistance(routeId, body.targetKm, req.userId ?? null);
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
    logger.error('route_adjust_failed', err, { traceId: req.traceId, routeId: req.params.routeId, userId: req.userId });
    if ((err as Error).message === 'route_version_conflict') {
      res.status(409).json(errorPayload('route version conflict', 'route_version_conflict', 409));
      return;
    }
    res.status(500).json(errorPayload('adjust failed', 'adjust_failed', 500));
  }
});

// 重映射路线起终点
router.put('/routes/:routeId/rebase', requireAuth, validateBody(schemas.rebaseRoute), async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params as { routeId: string };
    const body = (req.validated?.body || req.body) as { startPoint?: { lat: number; lng: number } | null; endPoint?: { lat: number; lng: number } | null; strategy?: string };
    const route = await rebaseRoute(routeId, body.startPoint ?? null, body.endPoint ?? null, body.strategy, req.userId ?? null);
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
    logger.error('route_rebase_failed', err, { traceId: req.traceId, routeId: req.params.routeId, userId: req.userId });
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
    logger.error('runs_list_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list runs failed', 'list_runs_failed', 500));
  }
});

export default router;
