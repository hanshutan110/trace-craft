/**
 * TraceCraft 管理后台共享类型定义
 *
 * 定义管理后台的模块、角色、权限、以及各种管理实体的数据结构
 * 前后端共用，确保管理 API 的类型安全
 */

// ===== 模块与常量定义 =====

/** 管理后台功能模块枚举 */
export type AdminModule = 'users' | 'roles' | 'sessions' | 'contents' | 'templates' | 'communityPosts' | 'comments' | 'reports' | 'feedback' | 'assets' | 'shareRecords' | 'auditLogs';
/** 模块键（含角色库，用于前端导航） */
export type AdminModuleKey = AdminModule | 'roleLibrary';

/** 所有可用模块列表（用于权限矩阵遍历） */
export const ADMIN_MODULES: AdminModule[] = ['users', 'roles', 'sessions', 'contents', 'templates', 'communityPosts', 'comments', 'reports', 'feedback', 'assets', 'shareRecords', 'auditLogs'];

/** 管理员用户状态常量 */
export const ADMIN_USER_STATUS = {
  ACTIVE: 'active',       // 正常
  DISABLED: 'disabled',   // 已禁用
  LOCKED: 'locked',       // 已锁定
} as const;

/** 内容管理状态常量 */
export const ADMIN_CONTENT_STATUS = {
  DRAFT: 'draft',         // 草稿
  PUBLISHED: 'published', // 已发布
  ARCHIVED: 'archived',   // 已归档
} as const;

/** 模板状态常量 */
export const ADMIN_TEMPLATE_STATUS = {
  ACTIVE: 'active',       // 启用
  DISABLED: 'disabled',   // 禁用
} as const;

/** 从常量对象派生的状态类型 */
export type AdminUserStatus = (typeof ADMIN_USER_STATUS)[keyof typeof ADMIN_USER_STATUS];
export type AdminContentStatus = (typeof ADMIN_CONTENT_STATUS)[keyof typeof ADMIN_CONTENT_STATUS];
export type AdminTemplateStatus = (typeof ADMIN_TEMPLATE_STATUS)[keyof typeof ADMIN_TEMPLATE_STATUS];

// ===== 管理员身份与角色 =====

/** 当前登录管理员的档案信息（含权限模块列表） */
export interface AdminProfile {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  sessionId?: string;
  readableModules?: AdminModule[];
  writableModules?: AdminModule[];
}

/** 角色定义项（用于角色库 / 新建角色时的选项） */
export interface RoleItem {
  code: string;            // 角色编码（唯一标识）
  name: string;            // 角色显示名
  desc: string;            // 角色描述
  permissionMatrix?: string; // 权限矩阵 JSON 字符串
}

/** 管理后台角色记录（含权限矩阵） */
export interface AdminRoleItem {
  id: string;
  code: string;
  name: string;
  desc: string;
  permissionMatrix: string;
  isActive: boolean;
  updatedAt: string;
}

/** 管理员会话记录（登录会话追踪） */
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

/** 管理后台用户记录 */
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

// ===== 内容管理 =====

/** 内容条目（公告 / FAQ / 帮助 / 政策等） */
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

/** 路线模板条目（模板库管理） */
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

// ===== 社区管理 =====

/** 社区帖子（管理后台视角，含审核字段） */
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

/** 社区评论（管理后台视角） */
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

/** 用户举报记录 */
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

/** 用户反馈条目 */
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

// ===== 资产与分享 =====

/** 用户资产记录（头像、分享海报、路线预览等） */
export interface UserAssetAdminItem {
  id: string;
  userId: string;
  assetType: 'avatar' | 'share_poster' | 'route_preview' | 'qr_card' | 'community_media';
  url: string;
  storageProvider: string;
  metadata: string;
  createdAt: string;
}

/** 路线分享记录 */
export interface RouteShareRecordAdminItem {
  id: string;
  userId: string;
  routeId: string;
  sessionId: string;
  channel: 'wechat' | 'moments' | 'xiaohongshu' | 'douyin' | 'poster' | 'system';
  sharePayload: string;
  createdAt: string;
}

// ===== 审计与概览 =====

/** 审计日志条目（记录管理员操作） */
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

/** 管理模块联合类型（所有可管理实体的并集） */
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

/** 管理列表查询参数（分页 + 可选筛选） */
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

/** 管理列表分页返回结果 */
export interface AdminListResult<T = AdminModuleItem> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

/** 概览面板 - 指标卡片 */
export interface AdminOverviewMetric {
  key: string;
  title: string;
  value: number;
  trend?: string;
}

/** 概览面板 - 待办事项 */
export interface AdminOverviewTodo {
  key: string;
  title: string;
  count: number;
  module: AdminModule;
  status?: string;
  priority: 'high' | 'medium' | 'low';
}

/** 概览面板 - 最近活动条目 */
export interface AdminOverviewRecentItem {
  id: string;
  title: string;
  module: AdminModule;
  status: string;
  createdAt: string;
}

/** 管理后台概览数据（首页仪表盘） */
export interface AdminOverview {
  metrics: AdminOverviewMetric[];
  todos: AdminOverviewTodo[];
  recent: AdminOverviewRecentItem[];
  generatedAt: string;
}
