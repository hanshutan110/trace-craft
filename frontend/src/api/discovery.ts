import { getAuthToken } from './auth';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

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

interface ApiPayload<T> {
  ok: boolean;
  templates?: RouteTemplateItem[];
  template?: RouteTemplateItem;
  favorites?: FavoriteItem[];
  hints?: SearchHints;
  results?: SearchResultItem[];
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

async function parsePayload<T>(response: Response): Promise<ApiPayload<T>> {
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.code || 'request_failed');
  }
  return payload;
}

export function selectTemplate(templateId: string): void {
  try {
    localStorage.setItem('tracecraft_selected_template_id', templateId);
  } catch {
    // Navigation still works; detail page will fall back to first template.
  }
}

export function getSelectedTemplateId(): string | null {
  try {
    return localStorage.getItem('tracecraft_selected_template_id');
  } catch {
    return null;
  }
}

export async function listTemplates(options: { category?: string; featured?: boolean; limit?: number } = {}): Promise<RouteTemplateItem[]> {
  const params = new URLSearchParams();
  if (options.category) params.set('category', options.category);
  if (options.featured) params.set('featured', 'true');
  if (options.limit) params.set('limit', String(options.limit));
  const response = await fetch(`${API_BASE}/templates?${params.toString()}`, {
    headers: authHeaders(),
  });
  const payload = await parsePayload<RouteTemplateItem[]>(response);
  return payload.templates || [];
}

export async function getTemplate(templateId: string): Promise<RouteTemplateItem> {
  const response = await fetch(`${API_BASE}/templates/${encodeURIComponent(templateId)}`, {
    headers: authHeaders(),
  });
  const payload = await parsePayload<RouteTemplateItem>(response);
  if (!payload.template) throw new Error('template_missing');
  return payload.template;
}

export async function listFavorites(): Promise<FavoriteItem[]> {
  const response = await fetch(`${API_BASE}/favorites`, {
    headers: authHeaders(),
  });
  const payload = await parsePayload<FavoriteItem[]>(response);
  return payload.favorites || [];
}

export async function addFavorite(targetType: string, targetId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/favorites`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ targetType, targetId }),
  });
  await parsePayload(response);
}

export async function removeFavorite(targetType: string, targetId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/favorites/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parsePayload(response);
}

export async function getSearchHints(): Promise<SearchHints> {
  const response = await fetch(`${API_BASE}/search/hints`, {
    headers: authHeaders(),
  });
  const payload = await parsePayload<SearchHints>(response);
  return payload.hints || { history: [], hot: [], categories: [] };
}

export async function searchTraceCraft(query: string, scope: string = 'all', limit: number = 30): Promise<SearchResultItem[]> {
  const params = new URLSearchParams({ q: query, scope, limit: String(limit) });
  const response = await fetch(`${API_BASE}/search?${params.toString()}`, {
    headers: authHeaders(),
  });
  const payload = await parsePayload<SearchResultItem[]>(response);
  return payload.results || [];
}
