import crypto from 'crypto';

export interface UserTokenPayload {
  userId: string;
  provider?: string;
  ts: number;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function requireSecret(name: string, fallback: string): string {
  const secret = process.env[name] || (!isProduction() ? fallback : '');
  if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
    throw new Error(`${name.toLowerCase()}_missing_or_weak`);
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signUserToken(payload: Omit<UserTokenPayload, 'ts'>): string {
  const secret = requireSecret('TRACECRAFT_USER_TOKEN_SECRET', 'tracecraft-user-dev-secret-change-me');
  const encoded = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString('base64url');
  return `tc_user.${encoded}.${sign(encoded, secret)}`;
}

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

export function signAdminTokenPayload(payload: Record<string, unknown>): string {
  const secret = requireSecret('TRACECRAFT_ADMIN_TOKEN_SECRET', 'tracecraft-admin-dev-secret-change-me');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

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
