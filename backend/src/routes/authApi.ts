import express, { type Request, type Response } from 'express';
import { errorPayload, successPayload } from './common';
import { parseQuickAuthProvider, quickLogin } from '../services/authService';

const router = express.Router();
const allowDevelopmentAuth = process.env.NODE_ENV !== 'production' || process.env.TRACECRAFT_ALLOW_DEV_AUTH === '1';

function normalizeDeviceId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().slice(0, 128);
  }
  return '';
}

router.post('/auth/quick-login', async (req: Request, res: Response) => {
  try {
    if (!allowDevelopmentAuth) {
      return res.status(403).json(errorPayload('development quick login disabled', 'dev_auth_disabled', 403));
    }
    const provider = parseQuickAuthProvider(req.body?.provider);
    if (!provider || provider === 'phone') {
      return res.status(400).json(errorPayload('unsupported quick login provider', 'unsupported_provider', 400));
    }

    const deviceId = normalizeDeviceId(req.body?.deviceId);
    if (!deviceId) {
      return res.status(400).json(errorPayload('device id required', 'device_id_required', 400));
    }

    const result = await quickLogin({
      provider,
      deviceId,
      authCode: typeof req.body?.authCode === 'string' ? req.body.authCode : null,
    });

    return res.json(successPayload({
      traceId: req.traceId,
      auth: result,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'quick_login_failed';
    return res.status(500).json(errorPayload(message, 'quick_login_failed', 500, { traceId: req.traceId }));
  }
});

router.post('/auth/phone-login', async (req: Request, res: Response) => {
  try {
    if (!allowDevelopmentAuth) {
      return res.status(403).json(errorPayload('development phone login disabled', 'dev_auth_disabled', 403));
    }
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
    const smsCode = typeof req.body?.smsCode === 'string' ? req.body.smsCode.trim() : '';
    const deviceId = normalizeDeviceId(req.body?.deviceId);

    if (phone.length !== 11) {
      return res.status(400).json(errorPayload('invalid phone number', 'invalid_phone', 400));
    }
    if (smsCode !== '8888') {
      return res.status(400).json(errorPayload('invalid sms code', 'invalid_sms_code', 400));
    }

    const result = await quickLogin({
      provider: 'phone',
      phone,
      deviceId: deviceId || phone,
      authCode: smsCode,
    });

    return res.json(successPayload({
      traceId: req.traceId,
      auth: result,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'phone_login_failed';
    return res.status(500).json(errorPayload(message, 'phone_login_failed', 500, { traceId: req.traceId }));
  }
});

export default router;
