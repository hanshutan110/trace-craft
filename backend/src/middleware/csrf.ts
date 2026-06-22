/**
 * CSRF 防护中间件
 *
 * 策略：Double-Submit Cookie
 *   - 服务端在响应中设置一个随机 CSRF Token Cookie（非 HttpOnly，前端可读）
 *   - 前端在请求头 X-CSRF-Token 中回传该值
 *   - 服务端比对 Cookie 和 Header 中的值，一致则放行
 *   - 安全方法（GET/HEAD/OPTIONS）跳过校验
 *   - 文件上传（multipart）跳过校验（multer 先于 CSRF 解析）
 */
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE = 'tc_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** 生成随机 CSRF Token（32 字节 hex） */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 设置 CSRF Cookie（非 HttpOnly，前端 JS 可读） */
export function setCsrfCookie(res: Response, token?: string): void {
  const value = token || generateCsrfToken();
  res.cookie(CSRF_COOKIE, value, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

/** CSRF 校验中间件 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }
  // multipart 文件上传跳过（multer 已先行解析）
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  const cookieToken = readCookie(req.headers.cookie, CSRF_COOKIE);
  const headerToken = req.headers[CSRF_HEADER];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ ok: false, code: 'csrf_validation_failed', error: 'CSRF token mismatch', status: 403 });
    return;
  }
  next();
}

/** 从 Cookie 字符串中读取指定名称的值 */
function readCookie(raw: string | undefined, name: string): string | null {
  if (!raw) return null;
  const prefix = `${name}=`;
  const item = raw.split(';').map((p) => p.trim()).find((p) => p.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}
