import { pgPool } from './postgres-storage';
import { newId } from '../utils/id';
import { getCachedSearchResults, setCachedSearchResults } from './cacheService';

function requireDb(): void {
  if (!pgPool) {
    throw new Error('postgres_not_configured');
  }
}

function normalizeLimit(value: unknown, fallback: number = 30, max: number = 100): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(num)));
}

function parseJson<T>(value: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

function searchTerms(keyword: string): string[] {
  const normalized = keyword.toLowerCase();
  const aliases: Record<string, string[]> = {
    '心形': ['心形', '爱心', 'heart'],
    '爱心': ['爱心', '心形', 'heart'],
    '五角星': ['五角星', '星形', 'star'],
    '星形': ['星形', '五角星', 'star'],
    '方形': ['方形', '正方形', 'square'],
    '正方形': ['正方形', '方形', 'square'],
    '圆形': ['圆形', '环形', 'circle'],
    '三角': ['三角', '三角形', 'triangle'],
    '六边形': ['六边形', 'hexagon'],
  };
  const terms = aliases[keyword] || aliases[normalized] || [keyword];
  return Array.from(new Set(terms.map((term) => `%${term.toLowerCase()}%`)));
}

async function ensureUser(userId: string): Promise<void> {
  await pgPool!.query(
    `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [userId]
  );
}

export interface RouteTemplateItem {
  id: string;
  templateCode: string;
  title: string;
  titleEn: string;
  category: string;
  shapeType: string;
  distanceKm: number;
  previewPayload: Record<string, unknown>;
  generationPayload: Record<string, unknown>;
  usageCount: number;
  favoriteCount: number;
  isFeatured: boolean;
  sortOrder: number;
}

export interface FavoriteItem {
  id: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  template?: RouteTemplateItem;
}

export interface SearchResultItem {
  id: string;
  type: 'route' | 'template' | 'user';
  title: string;
  subtitle: string;
  shapeType?: string;
  distanceKm?: number | null;
  usageCount?: number;
  isFavorited?: boolean;
}

function mapTemplate(row: Record<string, unknown>): RouteTemplateItem {
  return {
    id: String(row.id),
    templateCode: String(row.template_code),
    title: String(row.title),
    titleEn: String(row.title_en || row.title),
    category: String(row.category),
    shapeType: String(row.shape_type),
    distanceKm: Number(row.distance_km || 0),
    previewPayload: parseJson(row.preview_payload || {}) as Record<string, unknown>,
    generationPayload: parseJson(row.generation_payload || {}) as Record<string, unknown>,
    usageCount: Number(row.usage_count || 0),
    favoriteCount: Number(row.favorite_count || 0),
    isFeatured: Boolean(row.is_featured),
    sortOrder: Number(row.sort_order || 0),
  };
}

/** 获取已发布的内容（模板详情 / 帖子详情，按类型 + key 查询） */
export async function getPublishedContent(type: string, key: string): Promise<Record<string, unknown> | null> {
  requireDb();
  if (type === 'template') {
    const tpl = await getTemplate(key);
    return tpl ? { type: 'template', ...tpl } : null;
  }
  if (type === 'post') {
    const result = await pgPool!.query(
      `SELECT p.*, COALESCE(a.display_name, p.user_id) AS author
       FROM community_posts p
       LEFT JOIN auth_identities a ON a.user_id = p.user_id
       WHERE p.id = $1 AND p.status = 'published' AND p.review_status = 'approved'
       LIMIT 1`,
      [key]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      type: 'post',
      id: String(row.id),
      userId: String(row.user_id),
      author: String(row.author || row.user_id),
      title: String(row.title || ''),
      titleEn: String(row.title_en || row.title || ''),
      content: String(row.content || ''),
      contentEn: String(row.content_en || row.content || ''),
      topicTags: Array.isArray(row.topic_tags) ? row.topic_tags : [],
      mediaPayload: parseJson(row.media_payload || {}) as Record<string, unknown>,
      metrics: parseJson(row.metrics || {}) as Record<string, unknown>,
      likeCount: Number(row.like_count || 0),
      commentCount: Number(row.comment_count || 0),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    };
  }
  return null;
}

export async function listTemplates(query: { category?: unknown; featured?: unknown; limit?: unknown }): Promise<RouteTemplateItem[]> {
  requireDb();
  const params: unknown[] = [];
  const where = ['is_active = TRUE'];
  if (typeof query.category === 'string' && query.category.trim() && query.category !== 'recommend') {
    params.push(query.category.trim());
    where.push(`category = $${params.length}`);
  }
  if (query.featured === '1' || query.featured === 'true') {
    where.push('is_featured = TRUE');
  }
  params.push(normalizeLimit(query.limit, 50));
  const rows = await pgPool!.query(
    `SELECT * FROM route_templates
     WHERE ${where.join(' AND ')}
     ORDER BY is_featured DESC, sort_order ASC, updated_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.rows.map(mapTemplate);
}

export async function getTemplate(templateId: string): Promise<RouteTemplateItem | null> {
  requireDb();
  const result = await pgPool!.query(
    `SELECT * FROM route_templates
     WHERE (id = $1 OR template_code = $1) AND is_active = TRUE
     LIMIT 1`,
    [templateId]
  );
  return result.rows[0] ? mapTemplate(result.rows[0]) : null;
}

export async function listFavorites(userId: string): Promise<FavoriteItem[]> {
  requireDb();
  const result = await pgPool!.query(
    `SELECT f.id, f.target_type, f.target_id, f.created_at, t.*
     FROM user_favorites f
     LEFT JOIN route_templates t ON f.target_type = 'template' AND t.id = f.target_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    template: row.template_code ? mapTemplate(row) : undefined,
  }));
}

export async function setFavorite(userId: string, targetType: string, targetId: string): Promise<void> {
  requireDb();
  await ensureUser(userId);
  await pgPool!.query(
    `INSERT INTO user_favorites (id, user_id, target_type, target_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, target_type, target_id) DO NOTHING`,
    [newId('fav'), userId, targetType, targetId]
  );
}

export async function removeFavorite(userId: string, targetType: string, targetId: string): Promise<void> {
  requireDb();
  await pgPool!.query(
    `DELETE FROM user_favorites WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
    [userId, targetType, targetId]
  );
}

export async function getSearchHints(userId: string): Promise<{ history: string[]; hot: string[]; categories: string[] }> {
  requireDb();
  const [history, hot, categories] = await Promise.all([
    pgPool!.query(
      `SELECT keyword FROM user_search_history WHERE user_id = $1 ORDER BY last_searched_at DESC LIMIT 8`,
      [userId]
    ),
    pgPool!.query(
      `SELECT keyword FROM search_hot_keywords ORDER BY search_count DESC, updated_at DESC LIMIT 10`
    ),
    pgPool!.query(
      `SELECT DISTINCT category FROM route_templates WHERE is_active = TRUE ORDER BY category ASC LIMIT 10`
    ),
  ]);
  return {
    history: history.rows.map((row) => String(row.keyword)),
    hot: hot.rows.length > 0
      ? hot.rows.map((row) => String(row.keyword))
      : ['方形', '心形', '圆形', '三角', '五角星'],
    categories: categories.rows.map((row) => String(row.category)),
  };
}

export async function searchAll(userId: string, query: string, scope: string, limitValue: unknown): Promise<SearchResultItem[]> {
  requireDb();
  await ensureUser(userId);
  const keyword = query.trim();
  const limit = normalizeLimit(limitValue, 20, 50);
  if (!keyword) return [];

  // 尝试从 Redis 缓存读取
  const cached = await getCachedSearchResults(userId, keyword, scope);
  if (cached) return cached as SearchResultItem[];

  await pgPool!.query(
    `INSERT INTO user_search_history (id, user_id, keyword, scope, hit_count, last_searched_at)
     VALUES ($1, $2, $3, $4, 1, NOW())
     ON CONFLICT (user_id, scope, keyword)
     DO UPDATE SET hit_count = user_search_history.hit_count + 1, last_searched_at = NOW()`,
    [newId('search'), userId, keyword, scope || 'all']
  );
  await pgPool!.query(
    `INSERT INTO search_hot_keywords (keyword, scope, search_count, updated_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (keyword)
     DO UPDATE SET search_count = search_hot_keywords.search_count + 1, updated_at = NOW()`,
    [keyword, scope || 'all']
  );

  const likes = searchTerms(keyword);
  const results: SearchResultItem[] = [];

  if (scope === 'all' || scope === 'template') {
    const rows = await pgPool!.query(
      `SELECT t.*,
        EXISTS (
          SELECT 1 FROM user_favorites f
          WHERE f.user_id = $2 AND f.target_type = 'template' AND f.target_id = t.id
        ) AS is_favorited
       FROM route_templates t
       WHERE t.is_active = TRUE
         AND (
           LOWER(t.title) LIKE ANY($1::text[]) OR
           LOWER(t.title_en) LIKE ANY($1::text[]) OR
           LOWER(t.template_code) LIKE ANY($1::text[]) OR
           LOWER(t.shape_type) LIKE ANY($1::text[])
         )
       ORDER BY t.is_featured DESC, t.sort_order ASC
       LIMIT $3`,
      [likes, userId, limit]
    );
    results.push(...rows.rows.map((row) => ({
      id: String(row.id),
      type: 'template' as const,
      title: String(row.title),
      subtitle: `${Number(row.distance_km || 0).toFixed(1)} km · 官方模板`,
      shapeType: String(row.shape_type),
      distanceKm: Number(row.distance_km || 0),
      usageCount: Number(row.usage_count || 0),
      isFavorited: Boolean(row.is_favorited),
    })));
  }

  if (scope === 'all' || scope === 'route') {
    const rows = await pgPool!.query(
      `SELECT id, payload
       FROM routes
       WHERE user_id = $2
         AND status = 'active'
         AND (
           LOWER(COALESCE(payload->>'shapeType', '')) LIKE ANY($1::text[]) OR
           LOWER(COALESCE(payload->>'id', '')) LIKE ANY($1::text[])
         )
       ORDER BY updated_at DESC
       LIMIT $3`,
      [likes, userId, limit]
    );
    results.push(...rows.rows.map((row) => {
      const payload = parseJson(row.payload || {}) as Record<string, unknown>;
      const shapeType = String(payload.shapeType || 'route');
      const distanceM = Number(payload.actualDistanceM || (payload.meta as Record<string, unknown> | undefined)?.distanceM || 0);
      return {
        id: String(row.id),
        type: 'route' as const,
        title: `${shapeType} 路线`,
        subtitle: `${(distanceM / 1000).toFixed(1)} km · 我的轨迹`,
        shapeType,
        distanceKm: distanceM > 0 ? distanceM / 1000 : null,
      };
    }));
  }

  if (scope === 'all' || scope === 'user') {
    const rows = await pgPool!.query(
      `SELECT u.id, COALESCE(a.display_name, u.id) AS display_name
       FROM users u
       LEFT JOIN auth_identities a ON a.user_id = u.id
       WHERE LOWER(COALESCE(a.display_name, u.id)) LIKE ANY($1::text[])
       ORDER BY u.created_at DESC
       LIMIT $2`,
      [likes, Math.min(limit, 10)]
    );
    results.push(...rows.rows.map((row) => ({
      id: String(row.id),
      type: 'user' as const,
      title: String(row.display_name),
      subtitle: 'TraceCraft 用户',
    })));
  }

  const finalResults = results.slice(0, limit);

  // 写入缓存
  await setCachedSearchResults(userId, keyword, scope, finalResults);

  return finalResults;
}
