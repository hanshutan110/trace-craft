/**
 * TraceCraft 前端统一 API 客户端
 *
 * 提供：
 *   - API_BASE：统一的后端接口基址（从 Vite 环境变量读取）
 *   - apiRequest：带 credentials 和统一错误处理的 fetch 封装
 *   - apiGet / apiPost / apiPut / apiDelete：常用 HTTP 方法快捷函数
 */

/** API 基址：从 Vite 环境变量 VITE_API_BASE_URL 读取，默认指向本地开发服务器 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3017/api').replace(/\/$/, '');

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
 * 底层请求封装
 * - 自动附加 credentials: 'include'（携带 HttpOnly Cookie）
 * - 非 FormData 请求自动注入 Content-Type: application/json
 */
export async function apiRequest<T extends ApiPayload>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchWithCredentials(path, init);
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return parseApiResponse<T>(await fetchWithCredentials(path, init));
    }
  }
  return parseApiResponse<T>(response);
}

function fetchWithCredentials(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
}

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetchWithCredentials('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as ApiPayload;
    return payload.ok !== false;
  } catch {
    return false;
  }
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
