/**
 * 发现页相关 API 路由
 *
 * 接口：
 *   - GET /contents/:type/:key  获取内容（公告/FAQ/帮助等）
 *   - GET /templates            模板列表
 *   - GET /templates/:id        模板详情
 *   - GET/POST/DELETE /favorites 收藏管理
 *   - GET /search/hints         搜索提示词
 *   - GET /search               全局搜索
 */
import { Router, type Request, type Response } from 'express';
import { errorPayload, requireAuth, successPayload } from './common';
import {
  getPublishedContent,
  getSearchHints,
  getTemplate,
  listFavorites,
  listTemplates,
  removeFavorite,
  searchAll,
  setFavorite,
} from '../services/discoveryService';
import { logger } from '../services/logger';
import { validateBody, validateQuery, schemas } from '../middleware/validate';

const router = Router();

router.get('/contents/:type/:key', async (req: Request, res: Response) => {
  try {
    const content = await getPublishedContent(String(req.params.type), String(req.params.key));
    if (!content) {
      return res.status(404).json(errorPayload('content not found', 'content_not_found', 404));
    }
    return res.json(successPayload({ content }));
  } catch (err) {
    logger.error('content_get_failed', err, { type: req.params.type, key: req.params.key });
    return res.status(500).json(errorPayload('get content failed', 'content_failed', 500));
  }
});

router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const templates = await listTemplates(req.query);
    res.json(successPayload({ templates }));
  } catch (err) {
    logger.error('templates_list_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list templates failed', 'templates_failed', 500));
  }
});

router.get('/templates/:templateId', requireAuth, async (req: Request, res: Response) => {
  try {
    const template = await getTemplate(String(req.params.templateId));
    if (!template) {
      return res.status(404).json(errorPayload('template not found', 'template_not_found', 404));
    }
    return res.json(successPayload({ template }));
  } catch (err) {
    logger.error('template_get_failed', err, { traceId: req.traceId, templateId: req.params.templateId, userId: req.userId });
    return res.status(500).json(errorPayload('get template failed', 'template_failed', 500));
  }
});

router.get('/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    const favorites = await listFavorites(req.userId!);
    res.json(successPayload({ favorites }));
  } catch (err) {
    logger.error('favorites_list_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('list favorites failed', 'favorites_failed', 500));
  }
});

router.post('/favorites', requireAuth, validateBody(schemas.setFavorite), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as { targetType: string; targetId: string };
    await setFavorite(req.userId!, body.targetType, body.targetId);
    return res.json(successPayload({ favorited: true }));
  } catch (err) {
    logger.error('favorite_set_failed', err, { traceId: req.traceId, userId: req.userId });
    const message = err instanceof Error ? err.message : 'favorite_set_failed';
    const status = message === 'favorite_target_not_found' ? 404 : message === 'invalid_favorite_target_type' ? 400 : 500;
    return res.status(status).json(errorPayload(status === 500 ? 'set favorite failed' : message, status === 500 ? 'favorite_set_failed' : message, status));
  }
});

router.delete('/favorites/:targetType/:targetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const removed = await removeFavorite(req.userId!, String(req.params.targetType), String(req.params.targetId));
    res.json(successPayload({ favorited: false, removed }));
  } catch (err) {
    logger.error('favorite_remove_failed', err, { traceId: req.traceId, userId: req.userId, targetType: req.params.targetType, targetId: req.params.targetId });
    res.status(500).json(errorPayload('remove favorite failed', 'favorite_remove_failed', 500));
  }
});

router.get('/search/hints', requireAuth, async (req: Request, res: Response) => {
  try {
    const hints = await getSearchHints(req.userId!);
    res.json(successPayload({ hints }));
  } catch (err) {
    logger.error('search_hints_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('get search hints failed', 'search_hints_failed', 500));
  }
});

router.get('/search', requireAuth, validateQuery(schemas.searchQuery), async (req: Request, res: Response) => {
  try {
    const query = (req.validated?.query || req.query) as { q: string; scope: string; limit: number };
    const results = await searchAll(req.userId!, query.q, query.scope, query.limit);
    res.json(successPayload({ results }));
  } catch (err) {
    logger.error('search_list_failed', err, { traceId: req.traceId, userId: req.userId });
    res.status(500).json(errorPayload('search failed', 'search_failed', 500));
  }
});

export default router;
