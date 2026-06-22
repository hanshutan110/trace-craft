/**
 * TraceCraft 管理后台 API 客户端
 *
 * 提供：
 *   - 登录状态管理（hasAdminSession / markAdminLoggedIn / clearAdminSession）
 *   - 统一请求封装（自动附加 credentials、解析响应）
 *   - CRUD 操作（listModule / createRecord / updateRecord / removeRecord）
 */
export type {
  AdminListParams as ListParams,
  AdminModule,
  AdminModuleItem as ModuleItem,
  AdminOverview,
  AdminOverviewTodo,
  AdminProfile,
  AdminUser,
  RoleItem,
} from '../../../shared/admin';

import type {
  AdminListParams as ListParams,
  AdminModule,
  AdminModuleItem as ModuleItem,
  AdminOverview,
  AdminProfile,
  RoleItem,
} from '../../../shared/admin';

const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3017/api').replace(/\/$/, '');

const TOKEN_KEY = 'tracecraft_admin_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfToken: string | null = null;

/** API 响应载荷结构（泛型 T 为业务数据类型） */
interface ApiPayload<T> {
  ok: boolean;
  rows?: T[];
  row?: T;
  record?: T;
  removed?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  token?: string;
  admin?: AdminProfile;
  overview?: AdminOverview;
  cleanup?: {
    queued: boolean;
    jobId?: string;
    type: string;
    removed?: number;
  };
  error?: string;
  code?: string;
}

/** 检查本地是否标记已登录（真实 token 由 HttpOnly Cookie 承载） */
export function hasAdminSession(): boolean {
  try {
    return localStorage.getItem(TOKEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** 标记本地登录状态（Cookie 由后端 Set-Cookie 管理） */
export function markAdminLoggedIn(): void {
  try {
    localStorage.setItem(TOKEN_KEY, '1');
  } catch {
    // Ignore storage failures.
  }
}

/** 清除本地登录标记 */
export function clearAdminSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** 构建查询字符串（过滤空值/undefined） */
function buildQuery(params: Partial<ListParams>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** 从 Cookie 中读取后端下发的 CSRF Token */
function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)tc_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** 非安全方法调用前确保 CSRF Token 可用 */
async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  csrfToken = readCsrfCookie();
  if (csrfToken) return csrfToken;
  const response = await fetch(`${API_BASE}/csrf-token`, { credentials: 'include' });
  if (response.ok) {
    csrfToken = readCsrfCookie();
  }
  return csrfToken;
}

/** 统一请求封装：自动附加 credentials，解析 JSON 响应，失败时抛出错误 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfToken();
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? {'Content-Type': 'application/json'} : {}),
      ...(csrfToken && !SAFE_METHODS.has(method) ? {'X-CSRF-Token': csrfToken} : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || !payload.ok) {
    if (payload.code === 'csrf_validation_failed') {
      csrfToken = null;
    }
    throw new Error(payload.error || payload.code || 'admin_api_failed');
  }
  return payload as T;
}

/** 管理员登录（成功后自动标记本地登录状态） */
export async function login(username: string, password: string): Promise<AdminProfile> {
  const payload = await request<ApiPayload<never>>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({username, password}),
  });
  if (!payload.admin) {
    throw new Error('admin_login_failed');
  }
  markAdminLoggedIn();
  return payload.admin;
}

/** 获取当前登录管理员信息 */
export async function getMe(): Promise<AdminProfile> {
  const payload = await request<ApiPayload<never>>('/admin/auth/me');
  if (!payload.admin) throw new Error('admin_me_failed');
  return payload.admin;
}

/** 获取后台总览统计 */
export async function getOverview(): Promise<AdminOverview> {
  const payload = await request<ApiPayload<never>>('/admin/overview');
  if (!payload.overview) throw new Error('admin_overview_failed');
  return payload.overview;
}

/** 获取角色库列表 */
export async function listRoles(): Promise<RoleItem[]> {
  const payload = await request<ApiPayload<RoleItem>>('/admin/roleLibrary');
  return payload.rows || [];
}

/** 分页查询指定模块的数据列表 */
export async function listModule<T extends ModuleItem>(
  module: AdminModule,
  params: ListParams,
): Promise<{rows: T[]; total: number; page: number; limit: number}> {
  const payload = await request<ApiPayload<T>>(`/admin/${module}${buildQuery(params)}`);
  return {
    rows: payload.rows || [],
    total: payload.total || 0,
    page: payload.page || params.page,
    limit: payload.limit || params.limit,
  };
}

/** 创建新记录 */
export async function createRecord<T extends ModuleItem>(module: AdminModule, data: Partial<T>): Promise<T> {
  const payload = await request<ApiPayload<T>>(`/admin/${module}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!payload.record) throw new Error('admin_create_failed');
  return payload.record;
}

/** 更新指定记录 */
export async function updateRecord<T extends ModuleItem>(
  module: AdminModule,
  id: string,
  data: Partial<T>,
): Promise<T> {
  const payload = await request<ApiPayload<T>>(`/admin/${module}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!payload.record) throw new Error('admin_update_failed');
  return payload.record;
}

/** 删除指定记录，返回是否成功 */
export async function removeRecord(module: AdminModule, id: string): Promise<boolean> {
  const payload = await request<ApiPayload<never>>(`/admin/${module}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return Boolean(payload.removed);
}

/** 手动触发数据清理；有 Redis 队列时返回 jobId，否则同步返回 removed */
export async function runMaintenanceCleanup(type: 'location_events' | 'audit_logs', olderThanDays?: number): Promise<{
  queued: boolean;
  jobId?: string;
  type: string;
  removed?: number;
}> {
  const payload = await request<ApiPayload<never>>('/admin/maintenance/cleanup', {
    method: 'POST',
    body: JSON.stringify({ type, olderThanDays }),
  });
  if (!payload.cleanup) throw new Error('admin_cleanup_failed');
  return payload.cleanup;
}
