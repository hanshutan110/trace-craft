import { getAuthToken } from './auth';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

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

interface ApiPayload {
  ok: boolean;
  post?: CommunityPostItem;
  posts?: CommunityPostItem[];
  comment?: CommunityCommentItem;
  comments?: CommunityCommentItem[];
  notifications?: NotificationItem[];
  liked?: boolean;
  likeCount?: number;
  following?: boolean;
  error?: string;
  code?: string;
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  if (!token) {
    throw new Error('auth_required');
  }
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function parsePayload(response: Response): Promise<ApiPayload> {
  const payload = (await response.json()) as ApiPayload;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.code || 'request_failed');
  }
  return payload;
}

export function selectPost(postId: string): void {
  try {
    localStorage.setItem('tracecraft_selected_post_id', postId);
  } catch {
    // Post detail can fall back to first loaded post.
  }
}

export function getSelectedPostId(): string | null {
  try {
    return localStorage.getItem('tracecraft_selected_post_id');
  } catch {
    return null;
  }
}

export async function createCommunityPost(payload: {
  title?: string;
  content: string;
  topicTags?: string[];
  routeId?: string | null;
  metrics?: Record<string, unknown>;
  mediaPayload?: Record<string, unknown>;
}): Promise<CommunityPostItem> {
  const response = await fetch(`${API_BASE}/community/posts`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await parsePayload(response);
  if (!data.post) throw new Error('post_missing');
  return data.post;
}

export async function listCommunityPosts(tab: string = 'recommend'): Promise<CommunityPostItem[]> {
  const response = await fetch(`${API_BASE}/community/posts?tab=${encodeURIComponent(tab)}`, {
    headers: authHeaders(),
  });
  const data = await parsePayload(response);
  return data.posts || [];
}

export async function getCommunityPost(postId: string): Promise<{ post: CommunityPostItem; comments: CommunityCommentItem[] }> {
  const response = await fetch(`${API_BASE}/community/posts/${encodeURIComponent(postId)}`, {
    headers: authHeaders(),
  });
  const data = await parsePayload(response);
  if (!data.post) throw new Error('post_missing');
  return { post: data.post, comments: data.comments || [] };
}

export async function addCommunityComment(postId: string, content: string): Promise<CommunityCommentItem> {
  const response = await fetch(`${API_BASE}/community/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content }),
  });
  const data = await parsePayload(response);
  if (!data.comment) throw new Error('comment_missing');
  return data.comment;
}

export async function toggleCommunityLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const response = await fetch(`${API_BASE}/community/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await parsePayload(response);
  return { liked: Boolean(data.liked), likeCount: Number(data.likeCount || 0) };
}

export async function toggleFollowUser(userId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/community/follows/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await parsePayload(response);
  return Boolean(data.following);
}

export async function listNotifications(type: string = 'all'): Promise<NotificationItem[]> {
  const response = await fetch(`${API_BASE}/notifications?type=${encodeURIComponent(type)}`, {
    headers: authHeaders(),
  });
  const data = await parsePayload(response);
  return data.notifications || [];
}

export async function markNotificationsRead(id?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/notifications/read`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(id ? { id } : {}),
  });
  await parsePayload(response);
}
