/**
 * TraceCraft 社区相关 API
 */
import { apiGet, apiPost } from './client';

export interface CommunityPostItem {
  id: string;
  userId: string;
  author: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  topicTags: string[];
  metrics: Record<string, unknown>;
  mediaPayload: Record<string, unknown>;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  shareCount: number;
  createdAt: string;
  publishedAt: string | null;
  hasLiked: boolean;
  isFollowing: boolean;
}

export interface CommunityCommentItem {
  id: string;
  postId: string;
  userId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  targetType: string | null;
  targetId: string | null;
  actorUserId: string | null;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

// ===== localStorage 缓存：记录用户当前选中的帖子 ID =====

/** 缓存当前选中的帖子 ID，进入详情页时自动读取 */
export function selectPost(postId: string): void {
  try {
    localStorage.setItem('tracecraft_selected_post_id', postId);
  } catch {
    // Post detail can fall back to first loaded post.
  }
}

/** 读取缓存的帖子 ID，无缓存返回 null */
export function getSelectedPostId(): string | null {
  try {
    return localStorage.getItem('tracecraft_selected_post_id');
  } catch {
    return null;
  }
}

// ===== 帖子 CRUD =====

/** 发布社区帖子（支持关联路线、标签、媒体等） */
export async function createCommunityPost(payload: {
  title?: string;
  content: string;
  topicTags?: string[];
  routeId?: string | null;
  metrics?: Record<string, unknown>;
  mediaPayload?: Record<string, unknown>;
}): Promise<CommunityPostItem> {
  const data = await apiPost<{ post?: CommunityPostItem }>('/community/posts', payload);
  if (!data.post) throw new Error('post_missing');
  return data.post;
}

/** 获取帖子列表，支持按推荐/最新/热门/关注过滤 */
export async function listCommunityPosts(tab: string = 'recommend'): Promise<CommunityPostItem[]> {
  const data = await apiGet<{ posts?: CommunityPostItem[] }>(`/community/posts?tab=${encodeURIComponent(tab)}`);
  return data.posts || [];
}

/** 获取单个帖子详情及其评论列表 */
export async function getCommunityPost(postId: string): Promise<{ post: CommunityPostItem; comments: CommunityCommentItem[] }> {
  const data = await apiGet<{ post?: CommunityPostItem; comments?: CommunityCommentItem[] }>(
    `/community/posts/${encodeURIComponent(postId)}`,
  );
  if (!data.post) throw new Error('post_missing');
  return { post: data.post, comments: data.comments || [] };
}

/** 添加帖子评论 */
export async function addCommunityComment(postId: string, content: string): Promise<CommunityCommentItem> {
  const data = await apiPost<{ comment?: CommunityCommentItem }>(
    `/community/posts/${encodeURIComponent(postId)}/comments`,
    { content },
  );
  if (!data.comment) throw new Error('comment_missing');
  return data.comment;
}

/** 切换帖子点赞状态 */
export async function toggleCommunityLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const data = await apiPost<{ liked?: boolean; likeCount?: number }>(
    `/community/posts/${encodeURIComponent(postId)}/like`,
  );
  return { liked: Boolean(data.liked), likeCount: Number(data.likeCount || 0) };
}

/** 切换用户关注状态 */
export async function toggleFollowUser(userId: string): Promise<boolean> {
  const data = await apiPost<{ following?: boolean }>(
    `/community/follows/${encodeURIComponent(userId)}`,
  );
  return Boolean(data.following);
}

// ===== 通知管理 =====

/** 获取通知列表，支持按类型过滤（全部/系统/互动） */
export async function listNotifications(type: string = 'all'): Promise<NotificationItem[]> {
  const data = await apiGet<{ notifications?: NotificationItem[] }>(`/notifications?type=${encodeURIComponent(type)}`);
  return data.notifications || [];
}

/** 标记通知为已读，不传 id 则全部标记已读 */
export async function markNotificationsRead(id?: string): Promise<void> {
  await apiPost('/notifications/read', id ? { id } : {});
}
