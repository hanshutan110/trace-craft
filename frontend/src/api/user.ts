/**
 * TraceCraft 用户相关 API
 *
 * 包含用户画像、设置更新、跑步历史等功能
 */
import type { GeneratedRoute, GeoPoint, SessionMetrics } from '../types';
import { apiGet, apiPut } from './client';

export interface UserSettings {
  distanceUnit: 'km' | 'mile';
  voiceBroadcast: boolean;
  vibeDeviation: boolean;
  mapStyle: 'light' | 'satellite';
  lineWeight: 'thin' | 'mid' | 'thick';
}

export interface UserStats {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalRoutes: number;
  completedRuns: number;
  favoriteCount: number;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  signature: string;
  badge: string;
  authProvider: string;
  settings: UserSettings;
  stats: UserStats;
}

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

/** 获取当前登录用户的完整画像（基本信息 + 统计数据 + 设置） */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const payload = await apiGet<{ profile?: UserProfile }>('/me');
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

/** 更新用户设置（合并模式，仅更新传入的字段） */
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserProfile> {
  const payload = await apiPut<{ profile?: UserProfile }>('/me/settings', settings);
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

/** 获取跑步历史记录，默认返回最近 30 条 */
export async function getRunHistory(limit: number = 30): Promise<RunHistoryEntry[]> {
  const payload = await apiGet<{ runs?: RunHistoryEntry[] }>(`/run-history?limit=${limit}`);
  return payload.runs || [];
}
