/**
 * Token 签发与验证服务
 *
 * 支持两类 Token：
 *   - 用户 Token（tc_user / tc_user_refresh）：HMAC-SHA256 签名，用于用户认证和刷新
 *   - 管理员 Token（tc_admin）：支持密钥环（kid + secret），用于管理后台认证
 *
 * Token 格式：{前缀}.{base64url编码的payload}.{HMAC签名}
 */
import crypto from 'crypto';

/** 用户访问 Token 载荷 */
export interface UserTokenPayload {
  userId: string;
  provider?: string;
  ts: number;
  exp?: number;
  jti?: string;
}

/** 用户刷新 Token 载荷（与访问 Token 相同结构） */
export interface UserRefreshTokenPayload extends UserTokenPayload {}

/** 判断是否为生产环境 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** 获取环境变量中的密钥，生产环境禁止使用默认值，密钥长度必须 >= 32 */
function requireSecret(name: string, fallback: string): string {
  const secret = process.env[name] || (!isProduction() ? fallback : '');
  if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
    throw new Error(`${name.toLowerCase()}_missing_or_weak`);
  }
  return secret;
}

/** 校验已获取的密钥强度 */
function requireSecretValue(name: string, secret: string): string {
  if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
    throw new Error(`${name.toLowerCase()}_missing_or_weak`);
  }
  return secret;
}

/** HMAC-SHA256 签名，输出 base64url 编码 */
function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** 获取当前激活的管理员密钥（kid + secret） */
function activeAdminKey(): { kid: string; secret: string } {
  return {
    kid: String(process.env.TRACECRAFT_ADMIN_TOKEN_KID || 'default').trim() || 'default',
    secret: requireSecret('TRACECRAFT_ADMIN_TOKEN_SECRET', 'tracecraft-admin-dev-secret-change-me'),
  };
}

/** 构建管理员密钥环（支持多密钥滚动更新） */
function adminKeyring(): Map<string, string> {
  const active = activeAdminKey();
  const keys = new Map<string, string>([[active.kid, active.secret]]);
  const extra = String(process.env.TRACECRAFT_ADMIN_TOKEN_SECRETS || '').trim();
  if (!extra) return keys;
  for (const item of extra.split(',')) {
    const [rawKid, ...secretParts] = item.split(':');
    const kid = rawKid?.trim();
    const secret = secretParts.join(':').trim();
    if (!kid || !secret) continue;
    keys.set(kid, requireSecretValue(`TRACECRAFT_ADMIN_TOKEN_SECRETS.${kid}`, secret));
  }
  return keys;
}

/** 获取用户访问 Token 的 TTL（毫秒） */
export function userTokenTtlMs(): number {
  const ttlHours = Math.max(1, Number(process.env.TRACECRAFT_USER_TOKEN_TTL_HOURS || 24 * 30));
  return ttlHours * 60 * 60 * 1000;
}

/** 获取用户刷新 Token 的 TTL（毫秒） */
export function userRefreshTokenTtlMs(): number {
  const ttlHours = Math.max(1, Number(process.env.TRACECRAFT_USER_REFRESH_TOKEN_TTL_HOURS || 24 * 30));
  return ttlHours * 60 * 60 * 1000;
}

/** 对 Token 进行 SHA-256 哈希（用于存储和吊销比对） */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** 签发用户访问 Token */
export function signUserToken(payload: Omit<UserTokenPayload, 'ts'>): string {
  const secret = requireSecret('TRACECRAFT_USER_TOKEN_SECRET', 'tracecraft-user-dev-secret-change-me');
  const now = Date.now();
  const encoded = Buffer.from(JSON.stringify({
    ...payload,
    ts: now,
    exp: now + userTokenTtlMs(),
    jti: crypto.randomUUID(),
  })).toString('base64url');
  return `tc_user.${encoded}.${sign(encoded, secret)}`;
}

/** 签发用户刷新 Token */
export function signUserRefreshToken(payload: Omit<UserRefreshTokenPayload, 'ts'>): string {
  const secret = requireSecret('TRACECRAFT_USER_REFRESH_TOKEN_SECRET', 'tracecraft-user-refresh-dev-secret-change-me');
  const now = Date.now();
  const encoded = Buffer.from(JSON.stringify({
    ...payload,
    ts: now,
    exp: now + userRefreshTokenTtlMs(),
    jti: crypto.randomUUID(),
  })).toString('base64url');
  return `tc_user_refresh.${encoded}.${sign(encoded, secret)}`;
}

/** 验证用户访问 Token（时序安全比对 + 过期检查） */
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
    const expiresAt = parsed.exp || parsed.ts + userTokenTtlMs();
    if (!parsed.userId || !parsed.ts || Date.now() > expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 验证用户刷新 Token（必须包含 jti） */
export function verifyUserRefreshToken(token: string): UserRefreshTokenPayload | null {
  if (!token.startsWith('tc_user_refresh.')) return null;
  const [, encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  try {
    const secret = requireSecret('TRACECRAFT_USER_REFRESH_TOKEN_SECRET', 'tracecraft-user-refresh-dev-secret-change-me');
    const expected = sign(encoded, secret);
    if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as UserRefreshTokenPayload;
    const expiresAt = parsed.exp || parsed.ts + userRefreshTokenTtlMs();
    if (!parsed.userId || !parsed.ts || !parsed.jti || Date.now() > expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 签发管理员 Token（带 kid 标识密钥版本） */
export function signAdminTokenPayload(payload: Record<string, unknown>): string {
  const { kid, secret } = activeAdminKey();
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signedPayload = `${kid}.${encoded}`;
  return `tc_admin.${signedPayload}.${sign(signedPayload, secret)}`;
}

/** 验证并解析管理员 Token（支持新旧两种格式） */
export function verifySignedAdminPayload(token: string): Record<string, unknown> | null {
  let kid = '';
  let encoded = '';
  let sig = '';
  let signedPayload = '';
  let secret = '';

  if (token.startsWith('tc_admin.')) {
    const [, parsedKid, parsedEncoded, parsedSig] = token.split('.');
    kid = parsedKid || '';
    encoded = parsedEncoded || '';
    sig = parsedSig || '';
    secret = adminKeyring().get(kid) || '';
    signedPayload = `${kid}.${encoded}`;
  } else {
    // 兼容旧版两段式 admin token，方便滚动发布期间平滑过渡。
    [encoded, sig] = token.split('.');
    secret = activeAdminKey().secret;
    signedPayload = encoded;
  }

  if (!encoded || !sig || !secret) return null;
  const expected = sign(signedPayload, secret);
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}
