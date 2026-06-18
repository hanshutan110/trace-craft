export type AdminModule = 'users' | 'contents' | 'templates';
export type AdminModuleKey = AdminModule | 'roleLibrary';

export const ADMIN_MODULES: AdminModule[] = ['users', 'contents', 'templates'];

export const ADMIN_USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  LOCKED: 'locked',
} as const;

export const ADMIN_CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const ADMIN_TEMPLATE_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;

export type AdminUserStatus = (typeof ADMIN_USER_STATUS)[keyof typeof ADMIN_USER_STATUS];
export type AdminContentStatus = (typeof ADMIN_CONTENT_STATUS)[keyof typeof ADMIN_CONTENT_STATUS];
export type AdminTemplateStatus = (typeof ADMIN_TEMPLATE_STATUS)[keyof typeof ADMIN_TEMPLATE_STATUS];

export interface AdminProfile {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
}

export interface RoleItem {
  code: string;
  name: string;
  desc: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  roles: string[];
  status: AdminUserStatus;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  key: string;
  type: 'announcement' | 'faq' | 'help' | 'policy';
  title: string;
  summary: string;
  body: string;
  status: AdminContentStatus;
  sortOrder: number;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  code: string;
  name: string;
  category: 'map' | 'route' | 'ui';
  providerHint: string;
  payload: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  sortOrder: number;
  updatedAt: string;
  description: string;
}

export type AdminModuleItem = AdminUser | ContentItem | TemplateItem;

export interface AdminListParams {
  page: number;
  limit: number;
  keyword?: string;
  status?: string;
  type?: string;
  category?: string;
  roleCode?: string;
}

export interface AdminListResult<T = AdminModuleItem> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}
