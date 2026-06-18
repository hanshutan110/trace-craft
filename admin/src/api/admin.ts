/**
 * TraceCraft 管理后台 API 客户端
 *
 * 提供登录、鉴权、CRUD 等操作，认证通过 HttpOnly Cookie 管理
 */

export type {
  AdminListParams as ListParams,
  AdminModule,
  AdminModuleItem as ModuleItem,
  AdminProfile,
  AdminUser,
  ContentItem,
  RoleItem,
  TemplateItem,
} from '../../../shared/admin';

import type {
  AdminListParams as ListParams,
  AdminModule,
  AdminModuleItem as ModuleItem,
  AdminProfile,
  RoleItem,
} from '../../../shared/admin';

/** API 基址，从环境变量读取或默认本地开发服务 */
const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

/** localStorage 中的登录状态标记键 */
const TOKEN_KEY = 'tracecraft_admin_session';

/** API 响应载荷类型 */
interface ApiPayload<T> {
  ok: boolean;
  rows?: T[];
  record?: T;
  removed?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  admin?: AdminProfile;
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

/** 清除本地登录状态 */
export function clearAdminSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** 构建 URL 查询参数，自动过滤空值 */
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

/**
 * 统一请求封装
 * 自动附加 credentials:'include'，统一解析响应和错误处理
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? {'Content-Type': 'application/json'} : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.code || 'admin_api_failed');
  }
  return payload as T;
}

/** 管理员登录，成功后标记本地登录状态 */
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

/** 获取所有可用角色列表 */
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

/** 新增记录，返回创建后的完整数据 */
export async function createRecord<T extends ModuleItem>(module: AdminModule, data: Partial<T>): Promise<T> {
  const payload = await request<ApiPayload<T>>(`/admin/${module}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!payload.record) throw new Error('admin_create_failed');
  return payload.record;
}

/** 更新记录，返回更新后的完整数据 */
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

/** 软删除记录（禁用/归档/停用） */
export async function removeRecord(module: AdminModule, id: string): Promise<boolean> {
  const payload = await request<ApiPayload<never>>(`/admin/${module}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return Boolean(payload.removed);
}
