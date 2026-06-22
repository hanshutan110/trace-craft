/**
 * 路由层共享工具函数与中间件
 *
 * 提取自 index.ts，供各路由模块复用
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getMapConfig } from '../services/map-config';
import { verifyUserToken } from '../services/token';
import { isUserTokenRevoked } from '../services/tokenRevocationService';

// ===== Express Request 类型扩展 =====

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      userId?: string | null;
      idempotencyKey?: string;
    }
  }
}

// ===== 工具函数 =====

/** 构建请求追踪 ID，优先使用客户端传入的 header，否则自动生成 */
export function buildTraceId(req: Request): string {
  const headerId = req.headers['x-request-id'] || req.headers['x-trace-id'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim();
  }
  return `trace-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

/** 解析用户身份：只接受服务端签名 token，避免 body/query/header 冒充用户。 */
export function parseUserId(req: Request): string | null {
  const token = readUserToken(req);
  if (token) {
    return verifyUserToken(token)?.userId || null;
  }
  return null;
}

/** 异步解析用户身份：校验签名、过期时间和退出登录黑名单。 */
export async function parseUserIdAsync(req: Request): Promise<string | null> {
  const token = readUserToken(req);
  if (!token) return null;
  const payload = verifyUserToken(token);
  if (!payload) return null;
  if (await isUserTokenRevoked(token)) return null;
  return payload.userId;
}

export function readUserToken(req: Request): string | null {
  const token = bearerToken(req) || readCookie(req, 'tc_user_token');
  return token || null;
}

export function bearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string') return null;
  return auth.replace(/^Bearer\s+/i, '').trim() || null;
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (typeof raw !== 'string' || !raw) return null;
  const prefix = `${name}=`;
  const item = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

export function cookieOptions(maxAgeMs: number): { httpOnly: true; sameSite: 'lax'; secure: boolean; maxAge: number; path: string } {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeMs,
    path: '/',
  };
}

/** 将参数安全转换为正整数，并限制在 [min, max] 范围内 */
export function asPositiveInt(value: unknown, fallback: number, min: number = 1, max: number = 100): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const clamped = Math.max(min, Math.min(max, Math.floor(num)));
  return clamped;
}

/** 统一成功响应格式 */
export function successPayload(data: Record<string, unknown>): Record<string, unknown> {
  return { ok: true, ...data };
}

/** 统一失败响应格式 */
export function errorPayload(
  message: string,
  code: string,
  status: number = 500,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return { ok: false, code, error: message, status, ...extra };
}

/** 标准化位置上报数据 */
export function normalizeLocationBody(body: Record<string, unknown> | null): { lat: number; lng: number; accuracy: number | null; ts: number } {
  if (!body || typeof body !== 'object') return { lat: NaN, lng: NaN, accuracy: null, ts: Date.now() };
  return {
    lat: Number(body.lat),
    lng: Number(body.lng),
    accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null,
    ts: Number.isFinite(Number(body.ts)) ? Number(body.ts) : Date.now(),
  };
}

export function toOptionalNumber(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

/** 尝试将字符串解析为 JSON，失败则原样返回 */
export function parseJsonField<T>(value: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return value;
  }
}

// ===== 中间件 =====

/** 鉴权中间件：未识别到用户身份时返回 401 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void | Response {
  if (!req.userId) {
    return res.status(401).json(errorPayload('user not authenticated', 'auth_required', 401));
  }
  return next();
}

/** ETag 缓存中间件：客户端携带 If-None-Match 且配置未变更时返回 304 */
export function applyIfMatch(req: Request, res: Response, next: NextFunction): void | Response {
  const etag = req.headers['if-none-match'];
  if (!etag) return next();
  const config = getMapConfig();
  const currentTag = `"${config.mapConfigVersion}"`;
  if (etag === currentTag) {
    return res.status(304).end();
  }
  return next();
}
