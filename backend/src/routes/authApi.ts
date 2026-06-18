import express, { type Request, type Response } from 'express';
import { cookieOptions, errorPayload, successPayload } from './common';
import { parseQuickAuthProvider, quickLogin } from '../services/authService';

const router = express.Router();

function allowDevelopmentAuth(): boolean {
  return process.env.TRACECRAFT_ALLOW_DEV_AUTH === '1';
}

function normalizeDeviceId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().slice(0, 128);
  }
  return '';
}

router.post('/auth/quick-login', async (req: Request, res: Response) => {
  try {
    if (!allowDevelopmentAuth()) {
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
    res.cookie('tc_user_token', result.token, cookieOptions(30 * 24 * 60 * 60 * 1000));

    return res.json(successPayload({
      traceId: req.traceId,
      auth: {
        userId: result.userId,
        isNewUser: result.isNewUser,
        provider: result.provider,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'quick_login_failed';
    return res.status(500).json(errorPayload(message, 'quick_login_failed', 500, { traceId: req.traceId }));
  }
});

router.post('/auth/phone-login', async (req: Request, res: Response) => {
  try {
    if (!allowDevelopmentAuth()) {
      return res.status(403).json(errorPayload('development phone login disabled', 'dev_auth_disabled', 403));
    }
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
    const smsCode = typeof req.body?.smsCode === 'string' ? req.body.smsCode.trim() : '';
    const deviceId = normalizeDeviceId(req.body?.deviceId);

    if (phone.length !== 11) {
      return res.status(400).json(errorPayload('invalid phone number', 'invalid_phone', 400));
    }
    if (smsCode !== String(process.env.TRACECRAFT_DEV_SMS_CODE || '')) {
      return res.status(400).json(errorPayload('invalid sms code', 'invalid_sms_code', 400));
    }

    const result = await quickLogin({
      provider: 'phone',
      phone,
      deviceId: deviceId || phone,
      authCode: smsCode,
    });
    res.cookie('tc_user_token', result.token, cookieOptions(30 * 24 * 60 * 60 * 1000));

    return res.json(successPayload({
      traceId: req.traceId,
      auth: {
        userId: result.userId,
        isNewUser: result.isNewUser,
        provider: result.provider,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'phone_login_failed';
    return res.status(500).json(errorPayload(message, 'phone_login_failed', 500, { traceId: req.traceId }));
  }
});

export default router;
