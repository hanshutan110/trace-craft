/**
 * 用户相关 API 路由
 *
 * 接口：
 *   - GET/PUT /me              个人资料/设置
 *   - GET/POST /me/assets      资产管理
 *   - DELETE /me/cache         清除用户缓存
 *   - POST /me/feedback        提交反馈
 *   - POST/DELETE /me/push-token 推送 Token 管理
 *   - POST /share/cards        分享卡片生成
 *   - POST /me/qr-card         个人二维码生成
 *   - GET /jobs/:queue/:jobId  异步任务状态查询
 *   - GET /run-history         跑步历史记录
 */
import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { asPositiveInt, errorPayload, requireAuth, successPayload } from './common';
import { getUserProfile, listRunHistory, submitUserFeedback, updateUserProfile, updateUserSettings, deactivateAccount } from '../services/profileService';
import { allowedAssetMimeTypes, assetMaxBytes, clearUserGeneratedCache, listUserAssets, saveUserImageAsset } from '../services/assetService';
import { createShareCard, createUserQrCard } from '../services/shareService';
import { enqueueShareCard, enqueueQrCard, getJobStatus } from '../services/queueService';
import { deactivatePushToken, registerPushToken } from '../services/pushService';
import { cleanupUploadedFile, readUploadedFile, tempUploadStorage } from '../utils/uploadTemp';
import { logger } from '../services/logger';

const router = express.Router();
/** 资产上传中间件配置 */
const assetUpload = multer({
  storage: tempUploadStorage('assets'),
  limits: { fileSize: assetMaxBytes(), files: 1 },
  fileFilter: (_req, file, cb) => {
    if (allowedAssetMimeTypes().includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('unsupported_asset_type'));
  },
});

/** 资产上传错误统一处理 */
function uploadAsset(req: Request, res: Response, next: express.NextFunction): void {
  assetUpload.single('asset')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(errorPayload('asset file too large', 'asset_too_large', 413, { maxBytes: assetMaxBytes() }));
      return;
    }
    if ((err as Error).message === 'unsupported_asset_type') {
      res.status(415).json(errorPayload('unsupported asset type', 'unsupported_asset_type', 415, { allowedTypes: allowedAssetMimeTypes() }));
      return;
    }
    res.status(400).json(errorPayload('invalid asset upload', 'invalid_asset_upload', 400));
  });
}

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await getUserProfile(req.userId as string);
    res.json(successPayload({ profile, traceId: req.traceId }));
  } catch (error) {
    logger.error('profile_fetch_failed', error, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('fetch profile failed', 'profile_fetch_failed', 500));
  }
});

router.put('/me/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await updateUserSettings(req.userId as string, req.body || {});
    res.json(successPayload({ profile, settings: profile.settings, traceId: req.traceId }));
  } catch (error) {
    logger.error('settings_update_failed', error, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('update settings failed', 'settings_update_failed', 500));
  }
});

router.put('/me/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await updateUserProfile(req.userId as string, req.body || {});
    res.json(successPayload({ profile, traceId: req.traceId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'profile_update_failed';
    const status = message === 'profile_field_required' ? 400 : 500;
    logger.error('profile_update_failed', error, { traceId: req.traceId, userId: req.userId });
    res.status(status).json(errorPayload(message, message, status));
  }
});

router.get('/me/assets', requireAuth, async (req: Request, res: Response) => {
  try {
    const assets = await listUserAssets(req.userId as string, req.query.type);
    res.json(successPayload({ assets, traceId: req.traceId }));
  } catch (error) {
    logger.error('assets_list_failed', error, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list assets failed', 'assets_list_failed', 500));
  }
});

router.post('/me/assets', requireAuth, uploadAsset, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorPayload('missing asset file', 'missing_asset', 400));
    }
    const buffer = await readUploadedFile(req.file);
    const asset = await saveUserImageAsset({
      userId: req.userId as string,
      assetType: req.body?.assetType || 'avatar',
      buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });
    const profile = asset.assetType === 'avatar' ? await getUserProfile(req.userId as string) : undefined;
    return res.json(successPayload({ asset, profile, traceId: req.traceId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'asset_upload_failed';
    const status = ['invalid_asset_type', 'unsupported_asset_type', 'invalid_asset_size', 'invalid_image'].includes(message) ? 400 : 500;
    logger.error('asset_upload_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(status).json(errorPayload(message, message, status));
  } finally {
    await cleanupUploadedFile(req.file).catch((error) => logger.warn('upload_cleanup_failed', { message: (error as Error).message }));
  }
});

router.delete('/me/cache', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await clearUserGeneratedCache(req.userId as string);
    return res.json(successPayload({ cache: result, traceId: req.traceId }));
  } catch (error) {
    logger.error('cache_clear_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(500).json(errorPayload('clear cache failed', 'cache_clear_failed', 500));
  }
});

router.post('/me/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const feedback = await submitUserFeedback(req.userId as string, req.body || {});
    return res.json(successPayload({ feedback, traceId: req.traceId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'feedback_submit_failed';
    const status = message === 'feedback_content_required' ? 400 : 500;
    logger.error('feedback_submit_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(status).json(errorPayload(message, message, status));
  }
});

router.post('/me/push-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const token = await registerPushToken(req.userId as string, {
      token: req.body?.token,
      platform: req.body?.platform,
      deviceId: req.body?.deviceId,
      provider: req.body?.provider,
    });
    return res.json(successPayload({ token, traceId: req.traceId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'push_token_register_failed';
    const status = message === 'push_token_required' ? 400 : 500;
    logger.error('push_token_register_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(status).json(errorPayload(message, message, status));
  }
});

router.delete('/me/push-token', requireAuth, async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const removed = token ? await deactivatePushToken(req.userId as string, token) : false;
    return res.json(successPayload({ removed, traceId: req.traceId }));
  } catch (error) {
    logger.error('push_token_remove_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(500).json(errorPayload('push_token_remove_failed', 'push_token_remove_failed', 500));
  }
});

router.post('/share/cards', requireAuth, async (req: Request, res: Response) => {
  try {
    // 优先通过 BullMQ 异步生成，Redis 不可用时降级为同步
    const jobId = await enqueueShareCard({
      userId: req.userId as string,
      routeId: req.body?.routeId,
      sessionId: req.body?.sessionId,
      channel: req.body?.channel,
    });
    if (jobId) {
      return res.json(successPayload({ jobId, queue: 'share-card', async: true, traceId: req.traceId }));
    }
    // 同步降级
    const result = await createShareCard(req.userId as string, req.body || {});
    return res.json(successPayload({ ...result, async: false, traceId: req.traceId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'share_card_failed';
    const status = ['share_route_required', 'route_not_found'].includes(message) ? 400 : 500;
    logger.error('share_card_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(status).json(errorPayload(message, message, status));
  }
});

router.post('/me/qr-card', requireAuth, async (req: Request, res: Response) => {
  try {
    const jobId = await enqueueQrCard(req.userId as string);
    if (jobId) {
      return res.json(successPayload({ jobId, queue: 'qr-card', async: true, traceId: req.traceId }));
    }
    const result = await createUserQrCard(req.userId as string);
    return res.json(successPayload({ ...result, async: false, traceId: req.traceId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'qr_card_failed';
    logger.error('qr_card_failed', error, { traceId: req.traceId, userId: req.userId });
    return res.status(500).json(errorPayload(message, 'qr_card_failed', 500));
  }
});

/** 查询异步任务状态（前端轮询） */
router.get('/jobs/:queueName/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params as { queueName: string; jobId: string };
    const validQueues = ['share-card', 'qr-card', 'cleanup'];
    if (!validQueues.includes(queueName)) {
      return res.status(400).json(errorPayload('invalid queue name', 'invalid_queue', 400));
    }
    const status = await getJobStatus(queueName, jobId);
    return res.json(successPayload({ jobId, queue: queueName, ...status, traceId: req.traceId }));
  } catch (error) {
    logger.error('job_status_failed', error, { traceId: req.traceId, userId: req.userId, queueName: req.params.queueName, jobId: req.params.jobId });
    return res.status(500).json(errorPayload('job status fetch failed', 'job_status_failed', 500));
  }
});

router.get('/run-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = asPositiveInt(req.query.limit, 30, 1, 100);
    const runs = await listRunHistory(req.userId as string, limit);
    res.json(successPayload({ runs, traceId: req.traceId }));
  } catch (error) {
    logger.error('run_history_failed', error, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list run history failed', 'run_history_failed', 500));
  }
});

/**
 * 账号注销（软删除）
 * DELETE /me
 *
 * 清理用户所有关联数据，标记为已删除
 * 注销后需要前端清除登录状态并跳转登录页
 */
router.delete('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await deactivateAccount(req.userId as string);
    logger.info('account_deactivated', { traceId: req.traceId, userId: req.userId, cleanedTables: result.cleanedTables });
    res.json(successPayload({ ...result, traceId: req.traceId }));
  } catch (error) {
    logger.error('account_deactivation_failed', error, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('account deactivation failed', 'account_deactivation_failed', 500));
  }
});

export default router;
