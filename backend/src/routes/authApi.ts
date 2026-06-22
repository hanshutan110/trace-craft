/**
 * 认证相关 API 路由
 *
 * 接口：
 *   - POST /auth/quick-login   快捷登录（OAuth）
 *   - POST /auth/sms-code       发送短信验证码
 *   - POST /auth/phone-login    手机号登录
 *   - POST /auth/refresh        刷新 Token
 *   - POST /auth/logout         登出
 */
import express, { type Request, type Response } from 'express';
import { cookieOptions, errorPayload, readUserToken, successPayload } from './common';
import { parseQuickAuthProvider, quickLogin } from '../services/authService';
import {
  isRefreshTokenActive,
  revokeRefreshToken,
  revokeUserToken,
  storeRefreshToken,
} from '../services/tokenRevocationService';
import {
  signUserRefreshToken,
  signUserToken,
  userRefreshTokenTtlMs,
  userTokenTtlMs,
  verifyUserRefreshToken,
  verifyUserToken,
} from '../services/token';
import { sendSmsCode, verifySmsCode } from '../services/smsService';
import { verifyOAuthCode } from '../services/oauthService';
import { validateBody, schemas } from '../middleware/validate';
import { createRedisAwareRateLimiter } from '../middleware/rateLimit';

const router = express.Router();

/** 登录端点限流：每个 IP 在 15 分钟内最多 10 次登录尝试 */
const loginLimiter = createRedisAwareRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'login_rate_limit', error: '登录尝试过于频繁，请 15 分钟后再试', status: 429 },
});

/** 短信发送端点限流：每个 IP 在 1 小时内最多 5 次短信发送 */
const smsLimiter = createRedisAwareRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'sms_rate_limit', error: '短信发送过于频繁，请 1 小时后再试', status: 429 },
});

/** Token 刷新端点限流：每个 IP 在 15 分钟内最多 30 次 */
const refreshLimiter = createRedisAwareRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, code: 'refresh_rate_limit', error: '刷新请求过于频繁', status: 429 },
});

/** 标准化设备 ID（截断最大 128 字符） */
function normalizeDeviceId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().slice(0, 128);
  }
  return '';
}

/** 从 Cookie 中读取用户刷新 Token */
function readUserRefreshToken(req: Request): string | null {
  const raw = req.headers.cookie;
  if (typeof raw !== 'string' || !raw) return null;
  const prefix = 'tc_user_refresh_token=';
  const item = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

/** 设置认证 Cookie（访问 Token + 刷新 Token） */
async function setAuthCookies(res: Response, userId: string, provider: string | undefined | null): Promise<void> {
  const accessToken = signUserToken({ userId, provider: provider || undefined });
  const refreshToken = signUserRefreshToken({ userId, provider: provider || undefined });
  const refreshPayload = verifyUserRefreshToken(refreshToken);
  if (!refreshPayload) {
    throw new Error('refresh_token_issue_failed');
  }
  await storeRefreshToken(refreshToken, refreshPayload);
  res.cookie('tc_user_token', accessToken, cookieOptions(userTokenTtlMs()));
  res.cookie('tc_user_refresh_token', refreshToken, cookieOptions(userRefreshTokenTtlMs()));
}

/** 清除认证 Cookie */
function clearAuthCookies(res: Response): void {
  const options = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
  res.clearCookie('tc_user_token', options);
  res.clearCookie('tc_user_refresh_token', options);
}

router.post('/auth/quick-login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const provider = parseQuickAuthProvider(req.body?.provider);
    if (!provider || provider === 'phone') {
      return res.status(400).json(errorPayload('unsupported quick login provider', 'unsupported_provider', 400));
    }

    const deviceId = normalizeDeviceId(req.body?.deviceId);
    if (!deviceId) {
      return res.status(400).json(errorPayload('device id required', 'device_id_required', 400));
    }
    const authCode = typeof req.body?.authCode === 'string' ? req.body.authCode : '';
    const identity = await verifyOAuthCode(provider, authCode, deviceId);

    const result = await quickLogin({
      provider,
      deviceId,
      authCode,
      providerSubject: identity.providerSubject,
      displayName: identity.displayName,
    });
    await setAuthCookies(res, result.userId, result.provider);

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
    const status = ['oauth_provider_not_configured', 'oauth_code_required'].includes(message) ? 503 : 500;
    return res.status(status).json(errorPayload(message, 'quick_login_failed', status, { traceId: req.traceId }));
  }
});

router.post('/auth/sms-code', smsLimiter, validateBody(schemas.smsCode), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as { phone: string };
    const phone = body.phone;
    const result = await sendSmsCode(phone);
    return res.json(successPayload({
      traceId: req.traceId,
      sms: {
        provider: result.provider,
        expiresInSeconds: result.expiresInSeconds,
        devCode: result.devCode,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sms_send_failed';
    const status = message === 'invalid_phone'
      ? 400
      : message === 'sms_send_too_frequent'
        ? 429
        : message === 'sms_provider_not_configured'
          ? 503
          : 500;
    return res.status(status).json(errorPayload(message, message, status, { traceId: req.traceId }));
  }
});

router.post('/auth/phone-login', loginLimiter, validateBody(schemas.phoneLogin), async (req: Request, res: Response) => {
  try {
    const body = (req.validated?.body || req.body) as { phone: string; smsCode: string; deviceId?: string };
    const phone = body.phone;
    const smsCode = body.smsCode.trim();
    const deviceId = body.deviceId || phone;
    if (!verifySmsCode(phone, smsCode)) {
      return res.status(400).json(errorPayload('invalid sms code', 'invalid_sms_code', 400));
    }

    const result = await quickLogin({
      provider: 'phone',
      phone,
      deviceId: deviceId || phone,
      authCode: smsCode,
    });
    await setAuthCookies(res, result.userId, result.provider);

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

router.post('/auth/refresh', refreshLimiter, async (req: Request, res: Response) => {
  try {
    const refreshToken = readUserRefreshToken(req);
    const refreshPayload = refreshToken ? verifyUserRefreshToken(refreshToken) : null;
    if (!refreshToken || !refreshPayload || !(await isRefreshTokenActive(refreshToken, refreshPayload))) {
      return res.status(401).json(errorPayload('user not authenticated', 'auth_required', 401));
    }

    const currentToken = readUserToken(req);
    const currentPayload = currentToken ? verifyUserToken(currentToken) : null;
    if (currentToken && currentPayload) {
      await revokeUserToken(currentToken, currentPayload);
    }
    await revokeRefreshToken(refreshToken);
    await setAuthCookies(res, refreshPayload.userId, refreshPayload.provider);
    return res.json(successPayload({
      traceId: req.traceId,
      auth: {
        userId: refreshPayload.userId,
        provider: refreshPayload.provider || null,
        refreshed: true,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'refresh_failed';
    return res.status(500).json(errorPayload(message, 'refresh_failed', 500, { traceId: req.traceId }));
  }
});

router.post('/auth/logout', async (req: Request, res: Response) => {
  const token = readUserToken(req);
  const payload = token ? verifyUserToken(token) : null;
  if (token && payload) {
    await revokeUserToken(token, payload);
  }
  const refreshToken = readUserRefreshToken(req);
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  return res.json(successPayload({ loggedOut: true }));
});

export default router;
