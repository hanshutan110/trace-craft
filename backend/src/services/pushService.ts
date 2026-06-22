/**
 * 推送通知服务
 *
 * 管理用户设备的推送 Token（注册 / 注销）
 * 依赖 PostgreSQL 存储
 */
import { initStorage } from './storage';
import { pgPool } from './postgres-storage';
import { newId } from '../utils/id';

/** 推送 Token 注册输入 */
export interface PushTokenInput {
  platform: string;
  token: string;
  deviceId?: string | null;
  provider?: string | null;
}

/** 文本标准化（截断最大长度） */
function normalizeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

/** 确保 PostgreSQL 已初始化 */
async function ensurePostgres(): Promise<void> {
  await initStorage();
  if (!pgPool) throw new Error('postgres_push_required');
}

/** 注册推送 Token（支持 upsert，同一 token 重复注册会更新） */
export async function registerPushToken(userId: string, input: PushTokenInput): Promise<Record<string, unknown>> {
  await ensurePostgres();
  const token = normalizeText(input.token, 512);
  const platform = normalizeText(input.platform, 32);
  const provider = normalizeText(input.provider || 'capacitor', 32) || 'capacitor';
  if (!token || !platform) {
    throw new Error('push_token_required');
  }

  const id = newId('push');
  const result = await pgPool!.query(
    `INSERT INTO user_push_tokens (id, user_id, platform, device_id, push_token, provider, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
     ON CONFLICT (provider, push_token)
     DO UPDATE SET user_id = EXCLUDED.user_id,
                   platform = EXCLUDED.platform,
                   device_id = EXCLUDED.device_id,
                   is_active = TRUE,
                   updated_at = NOW()
     RETURNING id, user_id, platform, device_id, provider, is_active, updated_at`,
    [id, userId, platform, normalizeText(input.deviceId, 128) || null, token, provider],
  );
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    platform: result.rows[0].platform,
    deviceId: result.rows[0].device_id,
    provider: result.rows[0].provider,
    isActive: result.rows[0].is_active,
    updatedAt: result.rows[0].updated_at,
  };
}

/** 注销推送 Token（标记为不活跃） */
export async function deactivatePushToken(userId: string, token: string): Promise<boolean> {
  await ensurePostgres();
  const result = await pgPool!.query(
    `UPDATE user_push_tokens
        SET is_active = FALSE, updated_at = NOW()
      WHERE user_id = $1 AND push_token = $2 AND is_active = TRUE`,
    [userId, normalizeText(token, 512)],
  );
  return Number(result.rowCount || 0) > 0;
}
