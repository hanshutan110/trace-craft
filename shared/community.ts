/**
 * TraceCraft 社区共享类型定义
 *
 * 定义社区功能相关的帖子、评论、通知等数据结构
 * 前后端共用，确保社区 API 的类型安全
 */

/** 社区帖子（用户视角，含互动状态） */
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

/** 社区评论（支持嵌套回复） */
export interface CommunityCommentItem {
  id: string;
  postId: string;
  parentCommentId: string | null;
  userId: string;
  author: string;
  content: string;
  createdAt: string;
}

/** 通知消息条目 */
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
