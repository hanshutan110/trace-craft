import type { GeneratedRoute, GeoPoint, SessionMetrics } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

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

interface ApiPayload<T> {
  ok: boolean;
  profile?: UserProfile;
  settings?: UserSettings;
  runs?: RunHistoryEntry[];
  route?: GeneratedRoute;
  error?: string;
  code?: string;
  [key: string]: unknown;
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
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

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/me`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await parsePayload<UserProfile>(response);
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/me/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(settings),
  });
  const payload = await parsePayload<UserProfile>(response);
  if (!payload.profile) throw new Error('profile_missing');
  return payload.profile;
}

export async function getRunHistory(limit: number = 30): Promise<RunHistoryEntry[]> {
  const response = await fetch(`${API_BASE}/run-history?limit=${limit}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const payload = await parsePayload<RunHistoryEntry[]>(response);
  return payload.runs || [];
}
