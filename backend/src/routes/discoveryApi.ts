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

const router = Router();

router.get('/contents/:type/:key', async (req: Request, res: Response) => {
  try {
    const content = await getPublishedContent(String(req.params.type), String(req.params.key));
    if (!content) {
      return res.status(404).json(errorPayload('content not found', 'content_not_found', 404));
    }
    return res.json(successPayload({ content }));
  } catch (err) {
    console.error('[contents:get]', err);
    return res.status(500).json(errorPayload('get content failed', 'content_failed', 500));
  }
});

router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const templates = await listTemplates(req.query);
    res.json(successPayload({ templates }));
  } catch (err) {
    console.error('[templates:list]', err);
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
    console.error('[templates:get]', err);
    return res.status(500).json(errorPayload('get template failed', 'template_failed', 500));
  }
});

router.get('/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    const favorites = await listFavorites(req.userId!);
    res.json(successPayload({ favorites }));
  } catch (err) {
    console.error('[favorites:list]', err);
    res.status(500).json(errorPayload('list favorites failed', 'favorites_failed', 500));
  }
});

router.post('/favorites', requireAuth, async (req: Request, res: Response) => {
  try {
    const targetType = typeof req.body?.targetType === 'string' ? req.body.targetType : '';
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId : '';
    if (!targetType || !targetId) {
      return res.status(400).json(errorPayload('targetType and targetId required', 'invalid_favorite', 400));
    }
    await setFavorite(req.userId!, targetType, targetId);
    return res.json(successPayload({ favorited: true }));
  } catch (err) {
    console.error('[favorites:set]', err);
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
    console.error('[favorites:remove]', err);
    res.status(500).json(errorPayload('remove favorite failed', 'favorite_remove_failed', 500));
  }
});

router.get('/search/hints', requireAuth, async (req: Request, res: Response) => {
  try {
    const hints = await getSearchHints(req.userId!);
    res.json(successPayload({ hints }));
  } catch (err) {
    console.error('[search:hints]', err);
    res.status(500).json(errorPayload('get search hints failed', 'search_hints_failed', 500));
  }
});

router.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const scope = typeof req.query.scope === 'string' ? req.query.scope : 'all';
    const results = await searchAll(req.userId!, q, scope, req.query.limit);
    res.json(successPayload({ results }));
  } catch (err) {
    console.error('[search:list]', err);
    res.status(500).json(errorPayload('search failed', 'search_failed', 500));
  }
});

export default router;
