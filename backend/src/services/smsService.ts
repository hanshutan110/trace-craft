/**
 * 短信验证码服务
 *
 * 功能：
 *   - 生成并发送 6 位短信验证码
 *   - 验证码存储于内存（单实例适用），支持过期、重试次数限制
 *   - 开发模式（TRACECRAFT_ALLOW_DEV_AUTH=1）跳过真实短信发送
 *   - 支持多种 Provider：aliyun（阿里云）、tencent（腾讯云）、webhook、dev
 *
 * 环境变量配置：
 *   TRACECRAFT_SMS_PROVIDER=aliyun|tencent|webhook（未设置则需开启 dev 模式）
 *   阿里云：ALIYUN_SMS_ACCESS_KEY_ID + ALIYUN_SMS_ACCESS_KEY_SECRET + ALIYUN_SMS_SIGN_NAME + ALIYUN_SMS_TEMPLATE_CODE
 *   腾讯云：TENCENT_SMS_SECRET_ID + TENCENT_SMS_SECRET_KEY + TENCENT_SMS_SDK_APP_ID + TENCENT_SMS_SIGN_NAME + TENCENT_SMS_TEMPLATE_ID
 *   Webhook：TRACECRAFT_SMS_WEBHOOK_URL + TRACECRAFT_SMS_WEBHOOK_SECRET
 */
import crypto from 'crypto';
import { logger } from './logger';

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
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('sms_provider_failed');
}

// ===== 阿里云短信 Provider =====

/** 阿里云 API 签名（RPC 风格） */
function aliyunPercentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\//g, '%2F')
    .replace(/~/g, '%7E')
    .replace(/\+/g, '%2B')
    .replace(/%20/g, '+');
}

/** 构造阿里云 RPC 请求签名 */
function signAliyunRpc(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params).sort();
  const canonical = sorted.map((k) => `${aliyunPercentEncode(k)}=${aliyunPercentEncode(params[k])}`).join('&');
  const stringToSign = `POST&${aliyunPercentEncode('/')}&${aliyunPercentEncode(canonical)}`;
  return crypto.createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64');
}

/** 通过阿里云短信 API 发送验证码 */
async function sendViaAliyun(phone: string, code: string): Promise<void> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID || '';
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '';
  const signName = process.env.ALIYUN_SMS_SIGN_NAME || '';
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || '';
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    throw new Error('sms_aliyun_not_configured');
  }
  const params: Record<string, string> = {
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Action: 'SendSms',
    Version: '2017-05-25',
    RegionId: process.env.ALIYUN_SMS_REGION || 'cn-hangzhou',
    Format: 'JSON',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
  };
  params['Signature'] = signAliyunRpc(params, accessKeySecret);
  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const response = await fetch('https://dysmsapi.aliyuncs.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  const payload = await response.json() as { Code?: string; Message?: string };
  if (payload.Code !== 'OK') {
    logger.error('sms_aliyun_failed', new Error(payload.Message || 'aliyun_sms_error'), { code: payload.Code });
    throw new Error('sms_provider_failed');
  }
}

// ===== 腾讯云短信 Provider =====

/** 腾讯云 API v3 签名 */
function signTencentV3(
  payload: string,
  timestamp: number,
  service: string,
  secretKey: string,
): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:sms.tencentcloudapi.com\n\ncontent-type;host\n${hashedPayload}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonical = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonical}`;
  const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  return crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
}

/** 通过腾讯云短信 API 发送验证码 */
async function sendViaTencent(phone: string, code: string): Promise<void> {
  const secretId = process.env.TENCENT_SMS_SECRET_ID || '';
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY || '';
  const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID || '';
  const signName = process.env.TENCENT_SMS_SIGN_NAME || '';
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID || '';
  if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
    throw new Error('sms_tencent_not_configured');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: sdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code],
  });
  const service = 'sms';
  const credential = `${timestamp};${service}`;
  const signature = signTencentV3(body, timestamp, service, secretKey);
  const response = await fetch('https://sms.tencentcloudapi.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': 'sms.tencentcloudapi.com',
      'X-TC-Action': 'SendSms',
      'X-TC-Version': '2021-01-11',
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Credential': credential,
      'X-TC-Region': process.env.TENCENT_SMS_REGION || 'ap-guangzhou',
      'Authorization': `TC3-HMAC-SHA256 Credential=${credential}, SignedHeaders=content-type;host, Signature=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(5000),
  });
  const payload = await response.json() as { Response?: { Error?: { Code?: string; Message?: string }; SendStatusSet?: Array<{ Code?: string }> } };
  const sendStatus = payload.Response?.SendStatusSet?.[0];
  if (!sendStatus || sendStatus.Code !== 'Ok') {
    const errMsg = payload.Response?.Error?.Message || 'tencent_sms_error';
    logger.error('sms_tencent_failed', new Error(errMsg), { code: payload.Response?.Error?.Code });
    throw new Error('sms_provider_failed');
  }
}

/** 根据配置分发验证码（开发模式 / 阿里云 / 腾讯云 / Webhook） */
async function dispatchSmsCode(phone: string, code: string): Promise<'dev' | 'aliyun' | 'tencent' | 'webhook'> {
  if (isDevAuthEnabled()) return 'dev';
  const provider = String(process.env.TRACECRAFT_SMS_PROVIDER || '').toLowerCase();
  switch (provider) {
    case 'aliyun':
      await sendViaAliyun(phone, code);
      return 'aliyun';
    case 'tencent':
      await sendViaTencent(phone, code);
      return 'tencent';
    case 'webhook':
      await sendViaWebhook(phone, code);
      return 'webhook';
    default:
      throw new Error('sms_provider_not_configured');
  }
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
