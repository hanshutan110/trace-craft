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

const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const TOKEN_KEY = 'tracecraft_admin_session';

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
  error?: string;
  code?: string;
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token ? '1' : '');
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

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

export async function login(username: string, password: string): Promise<AdminProfile> {
  const payload = await request<ApiPayload<never>>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({username, password}),
  });
  if (!payload.admin) {
    throw new Error('admin_login_failed');
  }
  saveAdminToken('cookie');
  return payload.admin;
}

export async function getMe(): Promise<AdminProfile> {
  const payload = await request<ApiPayload<never>>('/admin/auth/me');
  if (!payload.admin) throw new Error('admin_me_failed');
  return payload.admin;
}

export async function listRoles(): Promise<RoleItem[]> {
  const payload = await request<ApiPayload<RoleItem>>('/admin/roleLibrary');
  return payload.rows || [];
}

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

export async function createRecord<T extends ModuleItem>(module: AdminModule, data: Partial<T>): Promise<T> {
  const payload = await request<ApiPayload<T>>(`/admin/${module}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!payload.record) throw new Error('admin_create_failed');
  return payload.record;
}

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

export async function removeRecord(module: AdminModule, id: string): Promise<boolean> {
  const payload = await request<ApiPayload<never>>(`/admin/${module}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return Boolean(payload.removed);
}
