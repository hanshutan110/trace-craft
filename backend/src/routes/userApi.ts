import express, { type Request, type Response } from 'express';
import { asPositiveInt, errorPayload, requireAuth, successPayload } from './common';
import { getUserProfile, listRunHistory, updateUserSettings } from '../services/profileService';

const router = express.Router();

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await getUserProfile(req.userId as string);
    res.json(successPayload({ profile, traceId: req.traceId }));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorPayload('fetch profile failed', 'profile_fetch_failed', 500));
  }
});

router.put('/me/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await updateUserSettings(req.userId as string, req.body || {});
    res.json(successPayload({ profile, settings: profile.settings, traceId: req.traceId }));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorPayload('update settings failed', 'settings_update_failed', 500));
  }
});

router.get('/run-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = asPositiveInt(req.query.limit, 30, 1, 100);
    const runs = await listRunHistory(req.userId as string, limit);
    res.json(successPayload({ runs, traceId: req.traceId }));
  } catch (error) {
    console.error(error);
    res.status(500).json(errorPayload('list run history failed', 'run_history_failed', 500));
  }
});

export default router;
