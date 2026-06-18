/**
 * TraceCraft 认证相关 API
 *
 * 登录状态完全依赖 HttpOnly Cookie（由后端 Set-Cookie 管理），
 * 前端仅保留 localStorage 中的 userId/provider 作为 UI 状态标记。
 */
import { apiPost } from './client';

const AUTH_STORAGE_KEYS = {
  userId: 'tracecraft_user_id',
  provider: 'tracecraft_auth_provider',
  deviceId: 'tracecraft_device_id',
} as const;

export type QuickLoginProvider = 'wechat' | 'alipay';

interface AuthResult {
  userId: string;
  isNewUser: boolean;
  provider: QuickLoginProvider | 'phone';
}

/** 生成唯一设备标识，用于快捷登录关联 */
function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

// ===== 会话状态管理（仅 UI 标记） =====

export function hasAuthSession(): boolean {
  try {
    return Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.userId));
  } catch {
    return false;
  }
}

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

/** 将登录结果持久化到 localStorage（仅保存 UI 状态标记） */
function saveAuthMarker(auth: AuthResult): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.userId, auth.userId);
    localStorage.setItem(AUTH_STORAGE_KEYS.provider, auth.provider);
  } catch {
    // Keep the in-memory login state even if storage is unavailable.
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
    localStorage.removeItem(AUTH_STORAGE_KEYS.provider);
  } catch {
    // Ignore localStorage failures.
  }
}

// ===== 登录接口 =====

async function doLogin(
  path: string,
  body: Record<string, unknown>,
): Promise<AuthResult> {
  const payload = await apiPost<{ auth?: AuthResult }>(path, body);
  if (!payload.auth) throw new Error('auth_missing');
  saveAuthMarker(payload.auth);
  return payload.auth;
}

export async function quickLogin(provider: QuickLoginProvider): Promise<AuthResult> {
  return doLogin('/auth/quick-login', {
    provider,
    deviceId: getOrCreateDeviceId(),
    authCode: import.meta.env.DEV ? `dev-${provider}` : '',
  });
}

export async function phoneLogin(phone: string, smsCode: string): Promise<AuthResult> {
  return doLogin('/auth/phone-login', {
    phone,
    smsCode,
    deviceId: getOrCreateDeviceId(),
  });
}
