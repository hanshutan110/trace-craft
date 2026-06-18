/**
 * TraceCraft 用户相关 API
 *
 * 提供用户资料查询、设置更新、跑步历史等功能
 */
import type { GeneratedRoute, GeoPoint, SessionMetrics } from '../types';
import { apiGet, apiPost, apiPut, apiDelete, apiRequest } from './client';

/** 用户偏好设置（与后端 UserSettings 保持一致） */
export interface UserSettings {
  distanceUnit: 'km' | 'mile';
  voiceBroadcast: boolean;
  vibeDeviation: boolean;
  mapStyle: 'light' | 'satellite';
  lineWeight: 'thin' | 'mid' | 'thick';
}

/** 用户累计统计 */
export interface UserStats {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalRoutes: number;
  completedRuns: number;
  favoriteCount: number;
}

/** 用户完整资料（基本信息 + 统计 + 设置） */
export interface UserProfile {
  userId: string;
  displayName: string;
  signature: string;
  badge: string;
  authProvider: string;
  settings: UserSettings;
  stats: UserStats;
  avatarUrl?: string;
}

/** 用户资产（头像、分享海报、二维码卡片等） */
export interface UserAsset {
  id: string;
  assetType: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** 跑步历史记录条目 */
export interface RunHistoryEntry {
  sessionId: string;
  routeId: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  metrics: SessionMetrics;
  actualPath: GeoPoint[];
  route: GeneratedRoute | null;
}

/** 获取当前登录用户资料 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const payload = await apiGet<{ profile?: UserProfile }>('/me');
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

/** 更新用户偏好设置（部分更新） */
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserProfile> {
  const payload = await apiPut<{ profile?: UserProfile }>('/me/settings', settings);
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

/** 获取跑步历史记录（默认最近 30 条） */
export async function getRunHistory(limit: number = 30): Promise<RunHistoryEntry[]> {
  const payload = await apiGet<{ runs?: RunHistoryEntry[] }>(`/run-history?limit=${limit}`);
  return payload.runs || [];
}

/** 清除用户生成的缓存数据（DELETE /me/cache） */
export async function clearUserCache(): Promise<Record<string, unknown>> {
  const payload = await apiDelete<{ cache?: Record<string, unknown> }>('/me/cache');
  return payload.cache || {};
}

/** 更新用户资料（displayName / signature / badge） */
export async function updateUserProfile(patch: { displayName?: string; signature?: string; badge?: string }): Promise<UserProfile> {
  const payload = await apiPut<{ profile?: UserProfile }>('/me/profile', patch);
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

/** 提交用户反馈（content 必填，category 可选） */
export async function submitUserFeedback(body: { content: string; category?: string; contact?: string }): Promise<Record<string, unknown>> {
  const payload = await apiPost<{ feedback?: Record<string, unknown> }>('/me/feedback', body);
  return payload.feedback || {};
}

/** 生成用户个人二维码卡片 */
export async function createUserQrCard(): Promise<Record<string, unknown>> {
  const payload = await apiPost<Record<string, unknown>>('/me/qr-card', {});
  return payload;
}

/** 上传用户资源文件（头像/分享海报等，FormData 上传） */
export async function uploadUserAsset(file: File, assetType: string = 'avatar'): Promise<Record<string, unknown>> {
  const body = new FormData();
  body.append('asset', file);
  body.append('assetType', assetType);
  const payload = await apiRequest<{ asset?: Record<string, unknown>; profile?: UserProfile }>('/me/assets', {
    method: 'POST',
    body,
  });
  return payload.asset || {};
}
