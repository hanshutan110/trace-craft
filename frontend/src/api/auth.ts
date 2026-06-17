const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const AUTH_STORAGE_KEYS = {
  token: 'tracecraft_auth_token',
  userId: 'tracecraft_user_id',
  provider: 'tracecraft_auth_provider',
  deviceId: 'tracecraft_device_id',
} as const;

export type QuickLoginProvider = 'wechat' | 'alipay';

interface AuthPayload {
  ok: boolean;
  auth?: {
    userId: string;
    token: string;
    isNewUser: boolean;
    provider: QuickLoginProvider | 'phone';
  };
  error?: string;
  code?: string;
}

function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `device-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.token);
  } catch {
    return null;
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

export function saveAuthSession(auth: NonNullable<AuthPayload['auth']>): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, auth.token);
    localStorage.setItem(AUTH_STORAGE_KEYS.userId, auth.userId);
    localStorage.setItem(AUTH_STORAGE_KEYS.provider, auth.provider);
  } catch {
    // Keep the in-memory login state handled by App even if storage is unavailable.
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
    localStorage.removeItem(AUTH_STORAGE_KEYS.provider);
  } catch {
    // Ignore localStorage failures.
  }
}

async function parseAuthResponse(response: Response): Promise<NonNullable<AuthPayload['auth']>> {
  const payload = (await response.json()) as AuthPayload;
  if (!response.ok || !payload.ok || !payload.auth) {
    throw new Error(payload.error || payload.code || 'auth_failed');
  }
  saveAuthSession(payload.auth);
  return payload.auth;
}

export async function quickLogin(provider: QuickLoginProvider): Promise<NonNullable<AuthPayload['auth']>> {
  const response = await fetch(`${API_BASE}/auth/quick-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      deviceId: getOrCreateDeviceId(),
      authCode: import.meta.env.DEV ? `dev-${provider}` : '',
    }),
  });
  return parseAuthResponse(response);
}

export async function phoneLogin(phone: string, smsCode: string): Promise<NonNullable<AuthPayload['auth']>> {
  const response = await fetch(`${API_BASE}/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      smsCode,
      deviceId: getOrCreateDeviceId(),
    }),
  });
  return parseAuthResponse(response);
}
