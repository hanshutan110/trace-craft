/**
 * 社区相关 API 路由
 *
 * 接口：
 *   - GET/POST /community/posts         帖子列表/发布
 *   - POST /community/media             社区媒体上传
 *   - GET /community/posts/:id          帖子详情
 *   - POST /community/posts/:id/comments 评论发布
 *   - POST /community/posts/:id/like    点赞/取消点赞
 *   - POST /community/posts/:id/report  举报帖子
 *   - POST /community/follows/:id       关注/取消关注
 *   - GET /notifications                通知列表
 *   - POST /notifications/read          标记通知已读
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { asPositiveInt, errorPayload, requireAuth, successPayload } from './common';
import {
  addComment,
  createPost,
  getPost,
  listComments,
  listNotifications,
  listPosts,
  markNotificationsRead,
  reportPost,
  toggleFollow,
  togglePostLike,
} from '../services/communityService';
import { logger } from '../services/logger';
import { allowedAssetMimeTypes, assetMaxBytes, saveUserImageAsset } from '../services/assetService';
import { cleanupUploadedFile, readUploadedFile, tempUploadStorage } from '../utils/uploadTemp';
import { validateBody, schemas } from '../middleware/validate';

const router = Router();
const mediaUpload = multer({
  storage: tempUploadStorage('community'),
  limits: { fileSize: assetMaxBytes(), files: 1 },
  fileFilter: (_req, file, cb) => {
    if (allowedAssetMimeTypes().includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('unsupported_asset_type'));
  },
});

function uploadCommunityMedia(req: Request, res: Response, next: NextFunction): void {
  mediaUpload.single('media')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(errorPayload('media file too large', 'media_too_large', 413, { maxBytes: assetMaxBytes() }));
      return;
    }
    if ((err as Error).message === 'unsupported_asset_type') {
      res.status(415).json(errorPayload('unsupported media type', 'unsupported_media_type', 415, { allowedTypes: allowedAssetMimeTypes() }));
      return;
    }
    res.status(400).json(errorPayload('invalid media upload', 'invalid_media_upload', 400));
  });
}

router.get('/community/posts', requireAuth, async (req: Request, res: Response) => {
  try {
    const tab = typeof req.query.tab === 'string' ? req.query.tab : 'recommend';
    const result = await listPosts(req.userId!, {
      tab,
      page: asPositiveInt(req.query.page, 1, 1, 10000),
      limit: asPositiveInt(req.query.limit, 20, 1, 50),
    });
    res.json(successPayload({ ...result }));
  } catch (err) {
    logger.error('community_posts_list_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list community posts failed', 'community_posts_failed', 500));
  }
});

router.post('/community/posts', requireAuth, validateBody(schemas.createPost), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as Record<string, unknown>;
    const post = await createPost(req.userId!, body);
    res.json(successPayload({ post }));
  } catch (err) {
    logger.error('community_post_create_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('create community post failed', 'community_post_create_failed', 500));
  }
});

router.post('/community/media', requireAuth, uploadCommunityMedia, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorPayload('missing media file', 'missing_media', 400));
    }
    const asset = await saveUserImageAsset({
      userId: req.userId!,
      assetType: 'community_media',
      buffer: await readUploadedFile(req.file),
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });
    return res.json(successPayload({
      media: {
        assetId: asset.id,
        url: asset.url,
        mimeType: asset.metadata.mimeType || req.file.mimetype,
        width: asset.metadata.width || null,
        height: asset.metadata.height || null,
      },
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'community_media_upload_failed';
    const status = ['invalid_asset_type', 'unsupported_asset_type', 'invalid_asset_size', 'invalid_image'].includes(message) ? 400 : 500;
    logger.error('community_media_upload_failed', err, { traceId: req.traceId, userId: req.userId });
    return res.status(status).json(errorPayload(message, message, status));
  } finally {
    await cleanupUploadedFile(req.file).catch((error) => logger.warn('upload_cleanup_failed', { message: (error as Error).message }));
  }
});

router.get('/community/posts/:postId', requireAuth, async (req: Request, res: Response) => {
  try {
    const post = await getPost(req.userId!, String(req.params.postId));
    if (!post) {
      return res.status(404).json(errorPayload('post not found', 'post_not_found', 404));
    }
    const comments = await listComments(post.id);
    return res.json(successPayload({ post, comments }));
  } catch (err) {
    logger.error('community_post_get_failed', err, { traceId: req.traceId, postId: req.params.postId, userId: req.userId });
    return res.status(500).json(errorPayload('get community post failed', 'community_post_failed', 500));
  }
});

router.post('/community/posts/:postId/comments', requireAuth, validateBody(schemas.addComment), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as { content: string; parentCommentId?: string | null };
    const content = body.content.trim();
    const parentCommentId = body.parentCommentId?.trim() || null;
    const comment = await addComment(req.userId!, String(req.params.postId), content, parentCommentId);
    return res.json(successPayload({ comment }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'comment_add_failed';
    const status = message === 'parent_comment_not_found' || message === 'post_not_found' ? 404 : 500;
    logger.error('community_comment_add_failed', err, { traceId: req.traceId, postId: req.params.postId, userId: req.userId });
    return res.status(status).json(errorPayload(message === 'comment_add_failed' ? 'add comment failed' : message, message, status));
  }
});

router.post('/community/posts/:postId/like', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await togglePostLike(req.userId!, String(req.params.postId));
    res.json(successPayload(result));
  } catch (err) {
    logger.error('community_like_failed', err, { traceId: req.traceId, postId: req.params.postId, userId: req.userId });
    res.status(500).json(errorPayload('toggle like failed', 'like_failed', 500));
  }
});

router.post('/community/posts/:postId/report', requireAuth, validateBody(schemas.reportPost), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as Record<string, unknown>;
    const report = await reportPost(req.userId!, String(req.params.postId), body);
    return res.json(successPayload({ report }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'report_post_failed';
    const status = message === 'post_not_found' ? 404 : ['cannot_report_self_post'].includes(message) ? 400 : 500;
    logger.error('community_report_failed', err, { traceId: req.traceId, postId: req.params.postId, userId: req.userId });
    return res.status(status).json(errorPayload(message, message, status));
  }
});

router.post('/community/follows/:followingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await toggleFollow(req.userId!, String(req.params.followingId));
    res.json(successPayload(result));
  } catch (err) {
    logger.error('community_follow_failed', err, { traceId: req.traceId, followingId: req.params.followingId, userId: req.userId });
    res.status(500).json(errorPayload('toggle follow failed', 'follow_failed', 500));
  }
});

router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : 'all';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await listNotifications(req.userId!, type, { page, limit });
    res.json(successPayload({ notifications: result.notifications, page: result.page, limit: result.limit, hasMore: result.hasMore }));
  } catch (err) {
    logger.error('notifications_list_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list notifications failed', 'notifications_failed', 500));
  }
});

router.post('/notifications/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = typeof req.body?.id === 'string' ? req.body.id : undefined;
    await markNotificationsRead(req.userId!, id);
    res.json(successPayload({ read: true }));
  } catch (err) {
    logger.error('notifications_read_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('mark notifications read failed', 'notifications_read_failed', 500));
  }
});

/**
 * 批量标记通知已读
 * POST /notifications/batch-read
 * body: { ids: string[] }
 */
router.post('/notifications/batch-read', requireAuth, validateBody(schemas.batchReadNotifications), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as { ids: string[] };
    const ids = body.ids.slice(0, 100);
    for (const id of ids) {
      await markNotificationsRead(req.userId!, id);
    }
    res.json(successPayload({ read: true, count: Math.min(ids.length, 100) }));
  } catch (err) {
    logger.error('notifications_batch_read_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('batch mark read failed', 'notifications_batch_read_failed', 500));
  }
});

export default router;
