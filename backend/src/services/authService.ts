import crypto from 'crypto';
import { initStorage } from './storage';
import { pgPool } from './postgres-storage';
import { signUserToken } from './token';
import { newId } from '../utils/id';

export type QuickAuthProvider = 'wechat' | 'alipay' | 'phone';

export interface QuickLoginParams {
  provider: QuickAuthProvider;
  deviceId: string;
  authCode?: string | null;
  phone?: string | null;
}

export interface QuickLoginResult {
  userId: string;
  token: string;
  isNewUser: boolean;
  provider: QuickAuthProvider;
}

const PROVIDER_LABELS: Record<QuickAuthProvider, string> = {
  wechat: '微信',
  alipay: '支付宝',
  phone: '手机号',
};

function normalizeProvider(value: unknown): QuickAuthProvider | null {
  if (value === 'wechat' || value === 'alipay' || value === 'phone') return value;
  return null;
}

function normalizeSubject(params: QuickLoginParams): string {
  if (params.provider === 'phone' && params.phone) {
    return params.phone.replace(/\D/g, '');
  }
  const seed = params.authCode || params.deviceId;
  return crypto.createHash('sha256').update(`${params.provider}:${seed}`).digest('hex');
}

async function ensureAuthSchema(): Promise<void> {
  await pgPool!.query(`
    CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_subject)
    )
  `);
  await pgPool!.query(`CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id)`);
}

export function parseQuickAuthProvider(value: unknown): QuickAuthProvider | null {
  return normalizeProvider(value);
}

export async function quickLogin(params: QuickLoginParams): Promise<QuickLoginResult> {
  await initStorage();
  if (!pgPool) {
    throw new Error('postgres_auth_required');
  }
  await ensureAuthSchema();

  const subject = normalizeSubject(params);
  if (!subject) {
    throw new Error('invalid_auth_subject');
  }

  const existing = await pgPool.query(
    `SELECT user_id FROM auth_identities WHERE provider = $1 AND provider_subject = $2 LIMIT 1`,
    [params.provider, subject],
  );
  if (existing.rows[0]?.user_id) {
    const userId = String(existing.rows[0].user_id);
    return {
      userId,
      token: signUserToken({ userId, provider: params.provider }),
      isNewUser: false,
      provider: params.provider,
    };
  }

  const userId = newId('user');
  const identityId = newId('auth');
  const displayName = `${PROVIDER_LABELS[params.provider]}用户`;
  const metadata = {
    displayName,
    provider: params.provider,
    quickRegistered: true,
    createdFrom: 'quick_login',
  };

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, metadata) VALUES ($1, $2::jsonb)`,
      [userId, JSON.stringify(metadata)],
    );
    await client.query(
      `INSERT INTO auth_identities (id, provider, provider_subject, user_id, display_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [identityId, params.provider, subject, userId, displayName],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    userId,
    token: signUserToken({ userId, provider: params.provider }),
    isNewUser: true,
    provider: params.provider,
  };
}
