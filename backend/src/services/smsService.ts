/**
 * 短信验证码服务
 *
 * 功能：
 *   - 生成并发送 6 位短信验证码
 *   - 验证码存储于内存（单实例适用），支持过期、重试次数限制
 *   - 开发模式（TRACECRAFT_ALLOW_DEV_AUTH=1）跳过真实短信发送
 *   - 生产模式通过 Webhook 回调发送
 */
import crypto from 'crypto';

/** 短信验证码存储条目 */
interface SmsCodeEntry {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

/** 内存验证码存储（单实例部署适用） */
const codeStore = new Map<string, SmsCodeEntry>();
const SMS_CODE_TTL_MS = Math.max(60, Number(process.env.TRACECRAFT_SMS_CODE_TTL_SECONDS || 300)) * 1000;
const SMS_RESEND_INTERVAL_MS = Math.max(10, Number(process.env.TRACECRAFT_SMS_RESEND_INTERVAL_SECONDS || 60)) * 1000;
const SMS_MAX_ATTEMPTS = Math.max(1, Number(process.env.TRACECRAFT_SMS_MAX_ATTEMPTS || 5));

/** 检查是否开启开发模式认证（跳过真实短信发送） */
function isDevAuthEnabled(): boolean {
  return process.env.TRACECRAFT_ALLOW_DEV_AUTH === '1';
}

/** 手机号标准化：去除所有非数字字符 */
export function normalizePhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

/** 对手机号 + 验证码进行 HMAC 哈希，避免明文存储 */
function hashCode(phone: string, code: string): string {
  const secret = process.env.TRACECRAFT_SMS_CODE_SECRET || process.env.TRACECRAFT_USER_TOKEN_SECRET || 'tracecraft-sms-dev-secret-change-me';
  return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

/** 生成 6 位随机数字验证码 */
function generateSmsCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** 通过 Webhook 回调发送短信 */
async function sendViaWebhook(phone: string, code: string): Promise<void> {
  const url = process.env.TRACECRAFT_SMS_WEBHOOK_URL || '';
  if (!url) throw new Error('sms_provider_not_configured');
  const body = JSON.stringify({
    phone,
    code,
    ttlSeconds: Math.floor(SMS_CODE_TTL_MS / 1000),
    template: process.env.TRACECRAFT_SMS_TEMPLATE || 'tracecraft_login',
  });
  const secret = process.env.TRACECRAFT_SMS_WEBHOOK_SECRET || '';
  const signature = secret ? crypto.createHmac('sha256', secret).update(body).digest('hex') : '';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'X-TraceCraft-Signature': signature } : {}),
    },
    body,
  });
  if (!response.ok) throw new Error('sms_provider_failed');
}

/** 根据配置分发验证码（开发模式 / Webhook） */
async function dispatchSmsCode(phone: string, code: string): Promise<'dev' | 'webhook'> {
  if (isDevAuthEnabled()) return 'dev';
  const provider = String(process.env.TRACECRAFT_SMS_PROVIDER || '').toLowerCase();
  if (provider === 'webhook') {
    await sendViaWebhook(phone, code);
    return 'webhook';
  }
  throw new Error('sms_provider_not_configured');
}

/**
 * 发送短信验证码
 * 包含频率限制和验证码生成，开发模式下返回验证码
 */
export async function sendSmsCode(phone: string): Promise<{ provider: string; expiresInSeconds: number; devCode?: string }> {
  if (phone.length !== 11) throw new Error('invalid_phone');
  const now = Date.now();
  const existed = codeStore.get(phone);
  if (existed && now - existed.lastSentAt < SMS_RESEND_INTERVAL_MS) {
    throw new Error('sms_send_too_frequent');
  }
  const code = isDevAuthEnabled() ? String(process.env.TRACECRAFT_DEV_SMS_CODE || '8888') : generateSmsCode();
  const provider = await dispatchSmsCode(phone, code);
  codeStore.set(phone, {
    codeHash: hashCode(phone, code),
    expiresAt: now + SMS_CODE_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });
  return {
    provider,
    expiresInSeconds: Math.floor(SMS_CODE_TTL_MS / 1000),
    devCode: provider === 'dev' ? code : undefined,
  };
}

/**
 * 验证短信验证码
 * 使用时序安全比对，验证成功后自动清除
 */
export function verifySmsCode(phone: string, code: string): boolean {
  const entry = codeStore.get(phone);
  if (!entry || Date.now() > entry.expiresAt || entry.attempts >= SMS_MAX_ATTEMPTS) {
    codeStore.delete(phone);
    return false;
  }
  entry.attempts += 1;
  const actual = hashCode(phone, code);
  const ok = Buffer.byteLength(actual) === Buffer.byteLength(entry.codeHash)
    && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(entry.codeHash));
  if (ok) codeStore.delete(phone);
  return ok;
}
