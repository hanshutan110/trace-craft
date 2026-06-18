/**
 * TraceCraft Token 签名与验证模块
 *
 * 采用 HMAC-SHA256 签名算法，格式为 `base64url(payload).base64url(signature)`
 * 用户 token 格式：`tc_user.{payload}.{signature}`，默认 TTL 30 天
 * 管理员 token 格式：`{payload}.{signature}`，默认 TTL 12 小时
 * 生产环境必须配置足够长度的 SECRET 环境变量（≥32 字符）
 */

import crypto from 'crypto';

/** 用户 token 载荷 */
export interface UserTokenPayload {
  userId: string;
  provider?: string;
  ts: number;
}

/** 判断是否为生产环境（生产环境不允许使用回退密钥） */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** 获取指定名称的密钥，生产环境必须配置且长度 ≥ 32 */
function requireSecret(name: string, fallback: string): string {
  const secret = process.env[name] || (!isProduction() ? fallback : '');
  if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
    throw new Error(`${name.toLowerCase()}_missing_or_weak`);
  }
  return secret;
}

/** HMAC-SHA256 签名，返回 base64url 编码字符串 */
function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** 签发用户 token：将载荷与时间戳编码后签名 */
export function signUserToken(payload: Omit<UserTokenPayload, 'ts'>): string {
  const secret = requireSecret('TRACECRAFT_USER_TOKEN_SECRET', 'tracecraft-user-dev-secret-change-me');
  const encoded = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString('base64url');
  return `tc_user.${encoded}.${sign(encoded, secret)}`;
}

/** 验证用户 token：校验签名 + TTL 过期检查 */
export function verifyUserToken(token: string): UserTokenPayload | null {
  if (!token.startsWith('tc_user.')) return null;
  const [, encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  try {
    const secret = requireSecret('TRACECRAFT_USER_TOKEN_SECRET', 'tracecraft-user-dev-secret-change-me');
    const expected = sign(encoded, secret);
    if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as UserTokenPayload;
    const ttlHours = Math.max(1, Number(process.env.TRACECRAFT_USER_TOKEN_TTL_HOURS || 24 * 30));
    if (!parsed.userId || !parsed.ts || Date.now() - parsed.ts > ttlHours * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 签发管理员 token（通用载荷签名，包含角色/时间戳等信息） */
export function signAdminTokenPayload(payload: Record<string, unknown>): string {
  const secret = requireSecret('TRACECRAFT_ADMIN_TOKEN_SECRET', 'tracecraft-admin-dev-secret-change-me');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

/** 验证管理员 token 签名，返回解析后的载荷或 null */
export function verifySignedAdminPayload(token: string): Record<string, unknown> | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const secret = requireSecret('TRACECRAFT_ADMIN_TOKEN_SECRET', 'tracecraft-admin-dev-secret-change-me');
  const expected = sign(encoded, secret);
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}
