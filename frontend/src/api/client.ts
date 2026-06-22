/**
 * TraceCraft 前端统一 API 客户端
 *
 * 提供：
 *   - API_BASE：统一的后端接口基址（从 Vite 环境变量读取）
 *   - apiRequest：带 credentials 和统一错误处理的 fetch 封装
 *   - apiGet / apiPost / apiPut / apiDelete：常用 HTTP 方法快捷函数
 *   - Token 刷新并发锁：多个 401 同时触发时只刷新一次
 *   - 请求超时：默认 15s 超时自动取消
 *   - 请求重试：网络异常自动重试（最多 2 次）
 */

/** 安全 HTTP 方法（不需要 CSRF 校验） */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** API 基址：从 Vite 环境变量 VITE_API_BASE_URL 读取，默认指向本地开发服务器 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3017/api').replace(/\/$/, '');

/** CSRF Token 缓存（从 Cookie 中读取，由后端 /api/csrf-token 接口设置） */
let csrfToken: string | null = null;

/** 默认请求超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 15_000;

/** 最大自动重试次数 */
const MAX_RETRIES = 2;

/** 重试间隔基数（毫秒），每次翻倍 */
const RETRY_BASE_DELAY_MS = 300;

/** Token 刷新互斥锁：并发 401 时只触发一次 refresh，其余请求排队等待 */
let refreshPromise: Promise<boolean> | null = null;

/** 从 Cookie 中读取 CSRF Token */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)tc_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** 获取或刷新 CSRF Token */
async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  csrfToken = readCsrfCookie();
  if (csrfToken) return csrfToken;
  try {
    const response = await fetch(`${API_BASE}/csrf-token`, { credentials: 'include' });
    if (response.ok) {
      csrfToken = readCsrfCookie();
    }
  } catch {
    // 获取失败时继续无 Token 请求（CSRF 中间件会拦截）
  }
  return csrfToken;
}

/** API 响应载荷基类（ok 可选，兼容各接口自定义返回结构） */
interface ApiPayload {
  ok?: boolean;
  error?: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * 统一解析响应：检查 HTTP 状态和 ok 标记
 * - HTTP 状态非 2xx 或 payload.ok 为 false 时抛出带错误码的 Error
 */
export async function parseApiResponse<T extends ApiPayload>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.code || 'request_failed');
  }
  return payload;
}

/**
 * 带超时的 fetch：通过 AbortController + setTimeout 实现
 * 超时后自动取消请求并抛出 AbortError
 */
function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * 判断错误是否可重试（网络异常、超时、5xx）
 * POST/PUT/DELETE 等写操作仅在网络层面失败时重试，不对 5xx 重试
 */
function isRetryable(error: unknown, method: string): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof TypeError) return true; // fetch network error
  return false;
}

/** 延迟指定毫秒 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 底层请求封装
 * - 自动附加 credentials: 'include'（携带 HttpOnly Cookie）
 * - 非 FormData 请求自动注入 Content-Type: application/json
 * - 支持请求超时和自动重试
 */
export async function apiRequest<T extends ApiPayload>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  // 非 GET 请求前确保 CSRF Token 已获取
  const method = (init.method || 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfToken();
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithCredentials(path, init);
      if (response.status === 401 && !path.startsWith('/auth/')) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return parseApiResponse<T>(await fetchWithCredentials(path, init));
        }
      }
      return parseApiResponse<T>(response);
    } catch (err) {
      lastError = err;
      // CSRF Token 过期时清除缓存，下次请求重新获取
      if (err instanceof Error && err.message === 'csrf_validation_failed') {
        csrfToken = null;
      }
      if (attempt < MAX_RETRIES && isRetryable(err, method)) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function fetchWithCredentials(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  };
  if (csrfToken && !SAFE_METHODS.has((init.method || 'GET').toUpperCase())) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  return fetchWithTimeout(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
}

/**
 * Token 刷新（带并发锁）
 * 多个 401 同时触发时，只有第一个实际发起 refresh 请求，
 * 其余请求通过共享同一个 Promise 排队等待结果。
 */
async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetchWithCredentials('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        csrfToken = null;
        return false;
      }
      const payload = (await response.json()) as ApiPayload;
      // refresh 成功后清除旧 CSRF Token，下次请求时重新获取
      csrfToken = null;
      return payload.ok !== false;
    } catch {
      csrfToken = null;
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/** GET 请求快捷方法 */
export function apiGet<T extends ApiPayload>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

/** POST 请求快捷方法（支持 JSON 和 FormData） */
export function apiPost<T extends ApiPayload>(path: string, body: unknown = {}): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

/** PUT 请求快捷方法 */
export function apiPut<T extends ApiPayload>(path: string, body: unknown = {}): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** DELETE 请求快捷方法 */
export function apiDelete<T extends ApiPayload>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
