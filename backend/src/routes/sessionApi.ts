/**
 * 跑步会话相关 API 路由
 *
 * 包含：开始会话、查询状态、暂停/恢复、上报位置、结束会话
 */

import { Router, type Request, type Response } from 'express';
import {
  startRunSession,
  getRunSessionState,
  updateRunSessionState,
  appendLocation,
  finishRunSession,
  SESSION_STATUS,
} from '../services/routeService';
import type { GeoPoint } from '../utils/geo';
import {
  requireAuth,
  successPayload,
  errorPayload,
} from './common';
import { logger } from '../services/logger';
import { validateBody, schemas } from '../middleware/validate';

const router = Router();

// 开始跑步会话
router.post('/routes/:routeId/start', requireAuth, validateBody(schemas.startSession), async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params as { routeId: string };
    const body = (req.validated?.body || req.body) as { provider?: string; riskConfirmed?: boolean };
    const provider = body.provider;
    const riskConfirmed = body.riskConfirmed === true;
    const sessionBundle = await startRunSession(routeId, req.userId ?? null, provider, req.idempotencyKey, riskConfirmed);
    if (!sessionBundle) {
      res.status(404).json(errorPayload('route not found', 'route_not_found', 404));
      return;
    }
    res.json(successPayload({
      session: sessionBundle.session,
      sessionId: sessionBundle.session.id,
      currentState: sessionBundle.currentState,
      nextAction: sessionBundle.nextAction,
      resumed: sessionBundle.resumed || false,
      traceId: req.traceId,
      routeId,
    }));
  } catch (err) {
    logger.error('session_start_failed', err, { traceId: req.traceId, routeId: req.params.routeId, userId: req.userId });
    if ((err as Error).message === 'route_high_risk') {
      res.status(409).json(errorPayload('route risk is too high to start', 'route_high_risk', 409));
      return;
    }
    if ((err as Error).message === 'route_risk_confirmation_required') {
      res.status(409).json(errorPayload('route risk confirmation required', 'route_risk_confirmation_required', 409));
      return;
    }
    res.status(500).json(errorPayload('start run failed', 'start_run_failed', 500));
  }
});

// 查询跑步会话实时状态
router.get('/sessions/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const state = await getRunSessionState(sessionId, req.userId ?? null);
    if (!state) {
      res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
      return;
    }
    res.json(successPayload({ state, traceId: req.traceId }));
  } catch (err) {
    logger.error('session_state_fetch_failed', err, { traceId: req.traceId, sessionId: req.params.sessionId, userId: req.userId });
    res.status(500).json(errorPayload('get state failed', 'state_fetch_failed', 500));
  }
});

// 暂停跑步会话
router.post('/sessions/:sessionId/pause', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const state = await updateRunSessionState(sessionId, req.userId ?? null, SESSION_STATUS.PAUSED);
    if (!state) {
      res.status(409).json(errorPayload('cannot pause session', 'session_not_pauseable', 409));
      return;
    }
    res.json(successPayload({ state, traceId: req.traceId, nextAction: 'resume' }));
  } catch (err) {
    logger.error('session_pause_failed', err, { traceId: req.traceId, sessionId: req.params.sessionId, userId: req.userId });
    res.status(500).json(errorPayload('pause failed', 'pause_failed', 500));
  }
});

// 恢复跑步会话
router.post('/sessions/:sessionId/resume', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const state = await updateRunSessionState(sessionId, req.userId ?? null, SESSION_STATUS.RUNNING);
    if (!state) {
      res.status(409).json(errorPayload('cannot resume session', 'session_not_resumable', 409));
      return;
    }
    res.json(successPayload({ state, traceId: req.traceId, nextAction: 'report_location' }));
  } catch (err) {
    logger.error('session_resume_failed', err, { traceId: req.traceId, sessionId: req.params.sessionId, userId: req.userId });
    res.status(500).json(errorPayload('resume failed', 'resume_failed', 500));
  }
});

// 上报实时位置点
router.post('/sessions/:sessionId/location', requireAuth, validateBody(schemas.reportLocation), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const body = (req.validated?.body || req.body) as { lat: number; lng: number; accuracy?: number | null; ts?: number };
    const point: GeoPoint = { lat: body.lat, lng: body.lng, ts: body.ts ?? Date.now() };
    const accuracy = body.accuracy ?? null;
    const updated = await appendLocation(sessionId, { ...point, accuracy } as GeoPoint, req.userId ?? null);
    if (!updated) {
      res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
      return;
    }
    if (!updated.accepted) {
      res.status(409).json(
        errorPayload(updated.reason || 'location not accepted', 'location_rejected', 409, {
          reason: updated.reason,
          pointIndex: updated.pointIndex,
          lagHint: updated.lagHint,
        })
      );
      return;
    }
    res.json(successPayload({
      acceptedAt: new Date().toISOString(),
      pointIndex: updated.pointIndex,
      lagHint: updated.lagHint,
      routeState: updated.routeState,
      traceId: req.traceId,
      nextAction: 'report_location',
    }));
  } catch (err) {
    logger.error('session_location_failed', err, { traceId: req.traceId, sessionId: req.params.sessionId, userId: req.userId });
    res.status(500).json(errorPayload('location update failed', 'location_failed', 500));
  }
});

// 结束跑步会话
router.post('/sessions/:sessionId/finish', requireAuth, validateBody(schemas.finishSession), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const body = (req.validated?.body || req.body) as { actualPath?: GeoPoint[] };
    const actualPath = Array.isArray(body.actualPath) ? body.actualPath : [];
    const result = await finishRunSession(sessionId, actualPath, req.userId ?? null);
    if (!result) {
      res.status(404).json(errorPayload('session not found', 'session_not_found', 404));
      return;
    }
    res.json(successPayload({
      result,
      sessionId,
      traceId: req.traceId,
      nextAction: 'summary',
    }));
  } catch (err) {
    logger.error('session_finish_failed', err, { traceId: req.traceId, sessionId: req.params.sessionId, userId: req.userId });
    res.status(500).json(errorPayload('finish failed', 'finish_failed', 500));
  }
});

export default router;
