/**
 * TraceCraft 社区服务模块
 *
 * 提供帖子发布、评论、点赞、关注、通知等社区功能
 * 涉及事务操作，确保数据一致性
 */

import { pgPool } from './postgres-storage';
import { newId } from '../utils/id';
import { toIso } from '../utils/date';
import { safeJsonParse } from '../utils/json';

/** 确保数据库连接可用，否则抛出异常 */
function requireDb(): void {
  if (!pgPool) throw new Error('postgres_not_configured');
}

/** 确保用户记录存在（幂等插入） */
async function ensureUser(userId: string): Promise<void> {
  await pgPool!.query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [userId]);
}

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

function mapPost(row: Record<string, unknown>): CommunityPostItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    author: String(row.author || row.user_id),
    title: String(row.title || ''),
    titleEn: String(row.title_en || row.title || ''),
    content: String(row.content || ''),
    contentEn: String(row.content_en || row.content || ''),
    topicTags: Array.isArray(row.topic_tags) ? row.topic_tags as string[] : [],
    metrics: safeJsonParse(row.metrics || {}) as Record<string, unknown>,
    mediaPayload: safeJsonParse(row.media_payload || {}) as Record<string, unknown>,
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
    favoriteCount: Number(row.favorite_count || 0),
    shareCount: Number(row.share_count || 0),
    createdAt: toIso(row.created_at),
    publishedAt: row.published_at ? toIso(row.published_at) : null,
    hasLiked: Boolean(row.has_liked),
    isFollowing: Boolean(row.is_following),
  };
}

function mapComment(row: Record<string, unknown>): CommunityCommentItem {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    userId: String(row.user_id),
    author: String(row.author || row.user_id),
    content: String(row.content || ''),
    createdAt: toIso(row.created_at),
  };
}

export async function createPost(userId: string, body: Record<string, unknown>): Promise<CommunityPostItem> {
  requireDb();
  await ensureUser(userId);
  const id = newId('post');
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '路线分享';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const tags = Array.isArray(body.topicTags) ? body.topicTags.map(String) : [];
  const metrics = body.metrics && typeof body.metrics === 'object' ? body.metrics : {};
  const mediaPayload = body.mediaPayload && typeof body.mediaPayload === 'object' ? body.mediaPayload : {};
  await pgPool!.query(
    `INSERT INTO community_posts
       (id, user_id, route_id, title, title_en, content, content_en, topic_tags, media_payload, metrics, status, review_status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8::jsonb, $9::jsonb, 'published', 'approved', NOW())`,
    [
      id,
      userId,
      typeof body.routeId === 'string' && body.routeId ? body.routeId : null,
      title,
      title,
      content || title,
      tags,
      JSON.stringify(mediaPayload),
      JSON.stringify(metrics),
    ]
  );
  const post = await getPost(userId, id);
  if (!post) throw new Error('post_create_failed');
  return post;
}

export async function listPosts(userId: string, tab: string = 'recommend'): Promise<CommunityPostItem[]> {
  requireDb();
  await ensureUser(userId);
  const orderBy = tab === 'latest'
    ? 'p.published_at DESC NULLS LAST, p.created_at DESC'
    : tab === 'hot'
      ? '(p.like_count + p.comment_count + p.favorite_count) DESC, p.published_at DESC NULLS LAST'
      : 'p.published_at DESC NULLS LAST, p.created_at DESC';
  const followFilter = tab === 'follow' ? 'AND uf_filter.follower_id IS NOT NULL' : '';
  const result = await pgPool!.query(
    `SELECT p.*, COALESCE(a.display_name, p.user_id) AS author,
            cr.id IS NOT NULL AS has_liked,
            uf.id IS NOT NULL AS is_following
     FROM community_posts p
     LEFT JOIN auth_identities a ON a.user_id = p.user_id
     LEFT JOIN community_reactions cr ON cr.target_type = 'post' AND cr.target_id = p.id AND cr.user_id = $1
     LEFT JOIN user_follows uf ON uf.follower_id = $1 AND uf.following_id = p.user_id
     LEFT JOIN user_follows uf_filter ON uf_filter.follower_id = $1 AND uf_filter.following_id = p.user_id
     WHERE p.status = 'published' AND p.review_status = 'approved' ${followFilter}
     ORDER BY ${orderBy}
     LIMIT 50`,
    [userId]
  );
  return result.rows.map(mapPost);
}

export async function getPost(userId: string, postId: string): Promise<CommunityPostItem | null> {
  requireDb();
  await ensureUser(userId);
  const result = await pgPool!.query(
    `SELECT p.*, COALESCE(a.display_name, p.user_id) AS author,
            cr.id IS NOT NULL AS has_liked,
            uf.id IS NOT NULL AS is_following
     FROM community_posts p
     LEFT JOIN auth_identities a ON a.user_id = p.user_id
     LEFT JOIN community_reactions cr ON cr.target_type = 'post' AND cr.target_id = p.id AND cr.user_id = $1
     LEFT JOIN user_follows uf ON uf.follower_id = $1 AND uf.following_id = p.user_id
     WHERE p.id = $2 AND p.status <> 'deleted'
     LIMIT 1`,
    [userId, postId]
  );
  return result.rows[0] ? mapPost(result.rows[0]) : null;
}

export async function listComments(postId: string): Promise<CommunityCommentItem[]> {
  requireDb();
  const result = await pgPool!.query(
    `SELECT c.*, COALESCE(a.display_name, c.user_id) AS author
     FROM community_comments c
     LEFT JOIN auth_identities a ON a.user_id = c.user_id
     WHERE c.post_id = $1 AND c.status = 'published'
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return result.rows.map(mapComment);
}

export async function addComment(userId: string, postId: string, content: string): Promise<CommunityCommentItem> {
  requireDb();
  await ensureUser(userId);
  const id = newId('comment');
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO community_comments (id, post_id, user_id, content) VALUES ($1, $2, $3, $4)`,
      [id, postId, userId, content]
    );
    const postRows = await client.query(
      `UPDATE community_posts SET comment_count = comment_count + 1, updated_at = NOW()
       WHERE id = $1 RETURNING user_id, title`,
      [postId]
    );
    if (!postRows.rows[0]) throw new Error('post_not_found');
    const ownerId = postRows.rows[0]?.user_id;
    if (ownerId && ownerId !== userId) {
      await client.query(
        `INSERT INTO notifications (id, user_id, actor_user_id, type, title, body, target_type, target_id)
         VALUES ($1, $2, $3, 'comment', '收到新评论', $4, 'post', $5)`,
        [newId('notice'), ownerId, userId, content, postId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const result = await pgPool!.query(
    `SELECT c.*, COALESCE(a.display_name, c.user_id) AS author
     FROM community_comments c
     LEFT JOIN auth_identities a ON a.user_id = c.user_id
     WHERE c.id = $1`,
    [id]
  );
  return mapComment(result.rows[0]);
}

export async function togglePostLike(userId: string, postId: string): Promise<{ liked: boolean; likeCount: number }> {
  requireDb();
  await ensureUser(userId);
  const client = await pgPool!.connect();
  let liked = false;
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id FROM community_reactions WHERE target_type = 'post' AND target_id = $1 AND user_id = $2 AND reaction_type = 'like' LIMIT 1`,
      [postId, userId]
    );
    if (existing.rows[0]) {
      await client.query(`DELETE FROM community_reactions WHERE id = $1`, [existing.rows[0].id]);
      await client.query(`UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW() WHERE id = $1`, [postId]);
    } else {
      const inserted = await client.query(
        `INSERT INTO community_reactions (id, target_type, target_id, user_id, reaction_type)
         VALUES ($1, 'post', $2, $3, 'like')
         ON CONFLICT (target_type, target_id, user_id, reaction_type) DO NOTHING
         RETURNING id`,
        [newId('react'), postId, userId]
      );
      if (inserted.rows[0]) {
        const postRows = await client.query(
          `UPDATE community_posts SET like_count = like_count + 1, updated_at = NOW() WHERE id = $1 RETURNING user_id, like_count`,
          [postId]
        );
        if (!postRows.rows[0]) throw new Error('post_not_found');
        const ownerId = postRows.rows[0]?.user_id;
        if (ownerId && ownerId !== userId) {
          await client.query(
            `INSERT INTO notifications (id, user_id, actor_user_id, type, title, body, target_type, target_id)
             VALUES ($1, $2, $3, 'like', '收到新点赞', '有人点赞了你的作品', 'post', $4)`,
            [newId('notice'), ownerId, userId, postId]
          );
        }
      }
      liked = true;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const count = await pgPool!.query(`SELECT like_count FROM community_posts WHERE id = $1`, [postId]);
  return { liked, likeCount: Number(count.rows[0]?.like_count || 0) };
}

export async function toggleFollow(userId: string, followingId: string): Promise<{ following: boolean }> {
  requireDb();
  await ensureUser(userId);
  await ensureUser(followingId);
  if (userId === followingId) return { following: false };
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(`SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2`, [userId, followingId]);
    if (existing.rows[0]) {
      await client.query(`DELETE FROM user_follows WHERE id = $1`, [existing.rows[0].id]);
      await client.query('COMMIT');
      return { following: false };
    }
    const inserted = await client.query(
      `INSERT INTO user_follows (id, follower_id, following_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING id`,
      [newId('follow'), userId, followingId]
    );
    if (inserted.rows[0]) {
      await client.query(
        `INSERT INTO notifications (id, user_id, actor_user_id, type, title, body, target_type, target_id)
         VALUES ($1, $2, $3, 'follow', '新增关注', '有人关注了你', 'user', $3)`,
        [newId('notice'), followingId, userId]
      );
    }
    await client.query('COMMIT');
    return { following: Boolean(inserted.rows[0]) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listNotifications(userId: string, type: string = 'all'): Promise<NotificationItem[]> {
  requireDb();
  await ensureUser(userId);
  const params: unknown[] = [userId];
  const where = ['user_id = $1'];
  if (type !== 'all') {
    params.push(type === 'sys' ? 'system' : type);
    where.push(`type = $${params.length}`);
  }
  const result = await pgPool!.query(
    `SELECT * FROM notifications WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 80`,
    params
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body || ''),
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    isRead: Boolean(row.is_read),
    createdAt: toIso(row.created_at),
    metadata: safeJsonParse(row.metadata || {}) as Record<string, unknown>,
  }));
}

export async function markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
  requireDb();
  if (notificationId) {
    await pgPool!.query(`UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND id = $2`, [userId, notificationId]);
    return;
  }
  await pgPool!.query(`UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE`, [userId]);
}
