import { initStorage } from './storage';
import { pgPool } from './postgres-storage';
import {
  hashToken,
  type UserRefreshTokenPayload,
  type UserTokenPayload,
  userRefreshTokenTtlMs,
  userTokenTtlMs,
} from './token';

let schemaReady = false;

async function ensureRevocationSchema(): Promise<void> {
  if (schemaReady) return;
  if (!pgPool) return;
  // 表结构由 db/migrations/001_auth_tokens.sql 管理；这里仅做轻量存在性检查，避免运行期散落建表。
  await pgPool.query(`SELECT 1 FROM auth_revoked_tokens LIMIT 1`);
  await pgPool.query(`SELECT 1 FROM auth_refresh_tokens LIMIT 1`);
  schemaReady = true;
}

function tokenExpiresAt(payload: UserTokenPayload): Date {
  return new Date(payload.exp || payload.ts + userTokenTtlMs());
}

function refreshTokenExpiresAt(payload: UserRefreshTokenPayload): Date {
  return new Date(payload.exp || payload.ts + userRefreshTokenTtlMs());
}

export async function revokeUserToken(token: string, payload: UserTokenPayload): Promise<void> {
  await initStorage();
  if (!pgPool) return;
  await ensureRevocationSchema();
  await pgPool.query(
    `INSERT INTO auth_revoked_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO NOTHING`,
    [hashToken(token), payload.userId, tokenExpiresAt(payload)],
  );
}

export async function isUserTokenRevoked(token: string): Promise<boolean> {
  await initStorage();
  if (!pgPool) return false;
  await ensureRevocationSchema();
  const result = await pgPool.query(
    `SELECT 1
       FROM auth_revoked_tokens
      WHERE token_hash = $1 AND expires_at > NOW()
      LIMIT 1`,
    [hashToken(token)],
  );
  return Boolean(result.rows[0]);
}

export async function storeRefreshToken(token: string, payload: UserRefreshTokenPayload): Promise<void> {
  await initStorage();
  if (!pgPool) return;
  await ensureRevocationSchema();
  await pgPool.query(
    `INSERT INTO auth_refresh_tokens (token_hash, token_id, user_id, provider, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (token_hash) DO NOTHING`,
    [hashToken(token), payload.jti, payload.userId, payload.provider || null, refreshTokenExpiresAt(payload)],
  );
}

export async function isRefreshTokenActive(token: string, payload: UserRefreshTokenPayload): Promise<boolean> {
  await initStorage();
  if (!pgPool) return false;
  await ensureRevocationSchema();
  const result = await pgPool.query(
    `SELECT 1
       FROM auth_refresh_tokens
      WHERE token_hash = $1
        AND token_id = $2
        AND user_id = $3
        AND expires_at > NOW()
        AND revoked_at IS NULL
      LIMIT 1`,
    [hashToken(token), payload.jti, payload.userId],
  );
  return Boolean(result.rows[0]);
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await initStorage();
  if (!pgPool) return;
  await ensureRevocationSchema();
  await pgPool.query(
    `UPDATE auth_refresh_tokens
        SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)],
  );
}
