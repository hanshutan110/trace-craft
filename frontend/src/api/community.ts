/**
 * TraceCraft 社区相关 API
 *
 * 提供帖子 CRUD、评论、点赞、关注、通知等功能
 */
import { apiGet, apiPost } from './client';

/** 社区帖子条目 */
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

/** 帖子评论条目 */
export interface CommunityCommentItem {
  id: string;
  postId: string;
  userId: string;
  author: string;
  content: string;
  createdAt: string;
}

/** 系统通知条目 */
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

// ===== localStorage 缓存 =====

/** 缓存选中帖子 ID（用于详情页回显） */
export function selectPost(postId: string): void {
  try {
    localStorage.setItem('tracecraft_selected_post_id', postId);
  } catch {
    // Post detail can fall back to first loaded post.
  }
}

/** 获取缓存的选中帖子 ID */
export function getSelectedPostId(): string | null {
  try {
    return localStorage.getItem('tracecraft_selected_post_id');
  } catch {
    return null;
  }
}

// ===== 帖子 CRUD =====

/** 发布社区帖子 */
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

/** 查询帖子列表（按 tab 过滤：recommend/latest/following） */
export async function listCommunityPosts(tab: string = 'recommend'): Promise<CommunityPostItem[]> {
  const data = await apiGet<{ posts?: CommunityPostItem[] }>(`/community/posts?tab=${encodeURIComponent(tab)}`);
  return data.posts || [];
}

/** 获取帖子详情 + 评论列表 */
export async function getCommunityPost(postId: string): Promise<{ post: CommunityPostItem; comments: CommunityCommentItem[] }> {
  const data = await apiGet<{ post?: CommunityPostItem; comments?: CommunityCommentItem[] }>(
    `/community/posts/${encodeURIComponent(postId)}`,
  );
  if (!data.post) throw new Error('post_missing');
  return { post: data.post, comments: data.comments || [] };
}

/** 发表评论 */
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

/** 切换关注用户状态 */
export async function toggleFollowUser(userId: string): Promise<boolean> {
  const data = await apiPost<{ following?: boolean }>(
    `/community/follows/${encodeURIComponent(userId)}`,
  );
  return Boolean(data.following);
}

// ===== 通知 =====

/** 查询通知列表（默认全部，可按类型过滤） */
export async function listNotifications(type: string = 'all'): Promise<NotificationItem[]> {
  const data = await apiGet<{ notifications?: NotificationItem[] }>(`/notifications?type=${encodeURIComponent(type)}`);
  return data.notifications || [];
}

/** 标记通知已读（传 id 标记单条，不传标记全部） */
export async function markNotificationsRead(id?: string): Promise<void> {
  await apiPost('/notifications/read', id ? { id } : {});
}
