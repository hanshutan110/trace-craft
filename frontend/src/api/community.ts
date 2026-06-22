/**
 * TraceCraft 社区相关 API
 *
 * 提供帖子 CRUD、评论、点赞、关注、通知等功能
 */
import { apiGet, apiPost, apiRequest } from './client';
import type { CommunityCommentItem, CommunityPostItem, NotificationItem } from '../../../shared/community';
export type { CommunityCommentItem, CommunityPostItem, NotificationItem } from '../../../shared/community';

export interface CommunityMediaPayload {
  assetId: string;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
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

/** 上传社区图片，返回可直接放入 mediaPayload 的媒体信息 */
export async function uploadCommunityMedia(file: File): Promise<CommunityMediaPayload> {
  const body = new FormData();
  body.append('media', file);
  const data = await apiRequest<{ media?: CommunityMediaPayload }>('/community/media', {
    method: 'POST',
    body,
  });
  if (!data.media) throw new Error('media_missing');
  return data.media;
}

/** 查询帖子列表（按 tab 过滤：recommend/latest/hot/follow） */
export async function listCommunityPosts(tab: string = 'recommend', page: number = 1, limit: number = 20): Promise<CommunityPostItem[]> {
  const params = new URLSearchParams({
    tab,
    page: String(page),
    limit: String(limit),
  });
  const data = await apiGet<{ posts?: CommunityPostItem[] }>(`/community/posts?${params.toString()}`);
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

/** 发表评论；传 parentCommentId 时作为嵌套回复保存 */
export async function addCommunityComment(postId: string, content: string, parentCommentId?: string | null): Promise<CommunityCommentItem> {
  const data = await apiPost<{ comment?: CommunityCommentItem }>(
    `/community/posts/${encodeURIComponent(postId)}/comments`,
    parentCommentId ? { content, parentCommentId } : { content },
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

/** 通知分页结果 */
export interface NotificationPage {
  notifications: NotificationItem[];
  page: number;
  limit: number;
  hasMore: boolean;
  [key: string]: unknown;
}

/** 查询通知列表（支持分页，默认第 1 页每页 20 条） */
export async function listNotifications(
  type: string = 'all',
  page: number = 1,
  limit: number = 20
): Promise<NotificationPage> {
  const data = await apiGet<NotificationPage & { ok?: boolean }>(
    `/notifications?type=${encodeURIComponent(type)}&page=${page}&limit=${limit}`
  );
  return {
    notifications: data.notifications || [],
    page: data.page || 1,
    limit: data.limit || 20,
    hasMore: data.hasMore || false,
  };
}

/** 标记通知已读（传 id 标记单条，不传标记全部） */
export async function markNotificationsRead(id?: string): Promise<void> {
  await apiPost('/notifications/read', id ? { id } : {});
}

/** 批量标记通知已读（最多 100 条） */
export async function markNotificationsBatchRead(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const data = await apiPost<{ count?: number }>('/notifications/batch-read', { ids: ids.slice(0, 100) });
  return data.count || ids.length;
}

/** 举报帖子（reason 必填，description 可选） */
export async function reportCommunityPost(postId: string, reason: string, description?: string): Promise<void> {
  await apiPost(
    `/community/posts/${encodeURIComponent(postId)}/report`,
    description ? { reason, description } : { reason },
  );
}
