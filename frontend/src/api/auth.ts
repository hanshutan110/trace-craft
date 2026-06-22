/**
 * TraceCraft 认证相关 API
 *
 * 登录状态完全依赖 HttpOnly Cookie（由后端 Set-Cookie 管理），
 * 前端仅保留 localStorage 中的 userId/provider 作为 UI 状态标记。
 */
import { apiPost } from './client';

/** 本地存储键名映射（仅存储 UI 状态标记，非真实 token） */
const AUTH_STORAGE_KEYS = {
  userId: 'tracecraft_user_id',
  provider: 'tracecraft_auth_provider',
  deviceId: 'tracecraft_device_id',
} as const;

/** 快捷登录提供商类型 */
export type QuickLoginProvider = 'wechat' | 'alipay';

/** 登录接口返回结果 */
interface AuthResult {
  userId: string;
  isNewUser: boolean;
  provider: QuickLoginProvider | 'phone';
}

interface SmsCodeResult {
  provider: string;
  expiresInSeconds: number;
  devCode?: string;
}

/** 生成唯一设备 ID（优先使用 crypto.randomUUID，回退到时间戳 + 随机数） */
function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

// ===== 会话状态管理（仅 UI 标记） =====

/** 检查本地是否存在登录标记（仅判断 userId 是否存在） */
export function hasAuthSession(): boolean {
  try {
    return Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.userId));
  } catch {
    return false;
  }
}

/** 获取或创建设备 ID（用于快捷登录关联） */
export function getOrCreateDeviceId(): string {
  try {
    const current = localStorage.getItem(AUTH_STORAGE_KEYS.deviceId);
    if (current) return current;
    const next = createDeviceId();
    localStorage.setItem(AUTH_STORAGE_KEYS.deviceId, next);
    return next;
  } catch {
    return createDeviceId();
  }
}

/** 保存登录标记到 localStorage（仅存 userId/provider） */
function saveAuthMarker(auth: AuthResult): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.userId, auth.userId);
    localStorage.setItem(AUTH_STORAGE_KEYS.provider, auth.provider);
  } catch {
    // Keep the in-memory login state even if storage is unavailable.
  }
}

/** 清除本地登录标记（退出登录时调用） */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
    localStorage.removeItem(AUTH_STORAGE_KEYS.provider);
  } catch {
    // Ignore localStorage failures.
  }
}

// ===== 登录接口 =====

/** 通用登录请求：发送 POST 并保存登录标记 */
async function doLogin(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthResult> {
  const payload = await apiPost<{ auth?: AuthResult }>(path, body);
  if (!payload.auth) throw new Error('auth_missing');
  saveAuthMarker(payload.auth);
  return payload.auth;
}

/** 快捷登录（微信/支付宝；生产环境需由原生 SDK 填入真实 authCode） */
export async function quickLogin(provider: QuickLoginProvider): Promise<AuthResult> {
  return doLogin('/auth/quick-login', {
    provider,
    deviceId: getOrCreateDeviceId(),
    authCode: import.meta.env.DEV ? `dev-${provider}` : '',
  });
}

/** 手机号登录 */
export async function phoneLogin(phone: string, smsCode: string): Promise<AuthResult> {
  return doLogin('/auth/phone-login', {
    phone,
    smsCode,
    deviceId: getOrCreateDeviceId(),
  });
}

/** 发送短信验证码；开发模式可能返回 devCode 便于本地联调 */
export async function sendSmsCode(phone: string): Promise<SmsCodeResult> {
  const payload = await apiPost<{ sms?: SmsCodeResult }>('/auth/sms-code', { phone });
  if (!payload.sms) throw new Error('sms_send_failed');
  return payload.sms;
}

/** 退出登录（清除 Cookie + 本地标记） */
export async function logout(): Promise<void> {
  try {
    await apiPost('/auth/logout', {});
  } catch {
    // 忽略网络错误，确保本地标记始终被清除
  }
  clearAuthSession();
}
