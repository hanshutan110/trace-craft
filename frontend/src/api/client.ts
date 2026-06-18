/**
 * TraceCraft 前端统一 API 客户端
 *
 * 提供：
 *   - API_BASE：统一的后端接口基址（从 Vite 环境变量读取）
 *   - apiRequest：带 credentials 和统一错误处理的 fetch 封装
 *   - apiGet / apiPost / apiPut / apiDelete：常用 HTTP 方法快捷函数
 */

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

interface ApiPayload {
  ok?: boolean;
  error?: string;
  code?: string;
  [key: string]: unknown;
}

/** 统一解析响应：检查 HTTP 状态和 ok 标记，失败时抛出带错误码的 Error */
export async function parseApiResponse<T extends ApiPayload>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.code || 'request_failed');
  }
  return payload;
}

/** 底层请求封装：自动附加 credentials，按 body 类型注入 Content-Type */
export async function apiRequest<T extends ApiPayload>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  return parseApiResponse<T>(response);
}

export function apiGet<T extends ApiPayload>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T extends ApiPayload>(path: string, body: unknown = {}): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPut<T extends ApiPayload>(path: string, body: unknown = {}): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function apiDelete<T extends ApiPayload>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
