export type AdminModule = 'users' | 'roles' | 'sessions' | 'contents' | 'templates' | 'communityPosts' | 'comments' | 'reports' | 'feedback' | 'assets' | 'shareRecords' | 'auditLogs';
export type AdminModuleKey = AdminModule | 'roleLibrary';

export const ADMIN_MODULES: AdminModule[] = ['users', 'roles', 'sessions', 'contents', 'templates', 'communityPosts', 'comments', 'reports', 'feedback', 'assets', 'shareRecords', 'auditLogs'];

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
  sessionId?: string;
  readableModules?: AdminModule[];
  writableModules?: AdminModule[];
}

export interface RoleItem {
  code: string;
  name: string;
  desc: string;
  permissionMatrix?: string;
}

export interface AdminRoleItem {
  id: string;
  code: string;
  name: string;
  desc: string;
  permissionMatrix: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminSessionItem {
  id: string;
  adminUserId: string;
  username: string;
  ip: string;
  userAgent: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string;
  status: 'active' | 'expired' | 'revoked';
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
  titleEn: string;
  category: string;
  shapeType: string;
  distanceKm: number;
  previewPayload: string;
  generationPayload: string;
  usageCount: number;
  favoriteCount: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface CommunityPostAdminItem {
  id: string;
  userId: string;
  author: string;
  title: string;
  content: string;
  status: 'pending' | 'published' | 'hidden' | 'deleted';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectReason: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityCommentAdminItem {
  id: string;
  postId: string;
  userId: string;
  author: string;
  postTitle: string;
  content: string;
  status: 'published' | 'hidden' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReportAdminItem {
  id: string;
  postId: string;
  reporterId: string;
  reportType: string;
  reason: string;
  status: 'open' | 'closed';
  actionTaken: string;
  hidePost: boolean;
  createdAt: string;
  handledAt: string;
}

export interface UserFeedbackAdminItem {
  id: string;
  userId: string;
  contact: string;
  category: string;
  content: string;
  status: 'open' | 'processing' | 'closed';
  createdAt: string;
  handledAt: string;
}

export interface UserAssetAdminItem {
  id: string;
  userId: string;
  assetType: 'avatar' | 'share_poster' | 'route_preview' | 'qr_card';
  url: string;
  storageProvider: string;
  metadata: string;
  createdAt: string;
}

export interface RouteShareRecordAdminItem {
  id: string;
  userId: string;
  routeId: string;
  sessionId: string;
  channel: 'wechat' | 'moments' | 'xiaohongshu' | 'douyin' | 'poster' | 'system';
  sharePayload: string;
  createdAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorAdminId: string;
  action: string;
  targetType: string;
  targetId: string;
  requestPath: string;
  requestMethod: string;
  diff: string;
  createdAt: string;
}

export type AdminModuleItem =
  | AdminUser
  | AdminRoleItem
  | AdminSessionItem
  | ContentItem
  | TemplateItem
  | CommunityPostAdminItem
  | CommunityCommentAdminItem
  | CommunityReportAdminItem
  | UserFeedbackAdminItem
  | UserAssetAdminItem
  | RouteShareRecordAdminItem
  | AdminAuditLogItem;

export interface AdminListParams {
  page: number;
  limit: number;
  keyword?: string;
  status?: string;
  type?: string;
  category?: string;
  roleCode?: string;
  assetType?: string;
  channel?: string;
}

export interface AdminListResult<T = AdminModuleItem> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}
