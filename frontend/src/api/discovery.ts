/**
 * TraceCraft 发现/搜索相关 API
 */
import { apiGet, apiPost, apiDelete } from './client';

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

export interface SearchHints {
  history: string[];
  hot: string[];
  categories: string[];
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

// ===== localStorage 缓存：记录用户当前选中的模板 ID =====

/** 缓存当前选中的模板 ID，导航时自动读取 */
export function selectTemplate(templateId: string): void {
  try {
    localStorage.setItem('tracecraft_selected_template_id', templateId);
  } catch {
    // Navigation still works; detail page will fall back to first template.
  }
}

/** 读取缓存的模板 ID，无缓存返回 null */
export function getSelectedTemplateId(): string | null {
  try {
    return localStorage.getItem('tracecraft_selected_template_id');
  } catch {
    return null;
  }
}

// ===== 模板查询 =====

/** 查询模板列表，支持按分类/精选过滤 */
export async function listTemplates(options: { category?: string; featured?: boolean; limit?: number } = {}): Promise<RouteTemplateItem[]> {
  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  if (options.featured) params.set('featured', 'true');
  if (options.limit) params.set('limit', String(options.limit));
  const data = await apiGet<{ templates?: RouteTemplateItem[] }>(`/templates?${params.toString()}`);
  return data.templates || [];
}

/** 根据 ID 获取单个模板详情 */
export async function getTemplate(templateId: string): Promise<RouteTemplateItem> {
  const data = await apiGet<{ template?: RouteTemplateItem }>(`/templates/${encodeURIComponent(templateId)}`);
  if (!data.template) throw new Error('template_missing');
  return data.template;
}

// ===== 收藏管理 =====

/** 查询用户收藏列表 */
export async function listFavorites(): Promise<FavoriteItem[]> {
  const data = await apiGet<{ favorites?: FavoriteItem[] }>('/favorites');
  return data.favorites || [];
}

/** 添加收藏 */
export async function addFavorite(targetType: string, targetId: string): Promise<void> {
  await apiPost('/favorites', { targetType, targetId });
}

/** 移除收藏 */
export async function removeFavorite(targetType: string, targetId: string): Promise<void> {
  await apiDelete(`/favorites/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`);
}

// ===== 搜索功能 =====

/** 获取搜索建议：历史记录 + 热门关键词 + 分类列表 */
export async function getSearchHints(): Promise<SearchHints> {
  const data = await apiGet<{ hints?: SearchHints }>('/search/hints');
  return data.hints || { history: [], hot: [], categories: [] };
}

/** 全局搜索：支持路线/模板/用户多维度搜索 */
export async function searchTraceCraft(query: string, scope: string = 'all', limit: number = 30): Promise<SearchResultItem[]> {
  const params = new URLSearchParams({ q: query, scope, limit: String(limit) });
  const data = await apiGet<{ results?: SearchResultItem[] }>(`/search?${params.toString()}`);
  return data.results || [];
}
