/**
 * TraceCraft 路线相关 API
 *
 * 使用统一 apiClient 封装，去除重复的 API_BASE / authHeaders 定义
 */
import type { FinishResult, GeneratedRoute, GeoPoint, SessionState } from '../types';
import { apiGet, apiPost, apiRequest } from './client';
import { getDefaultMapProvider } from './mapConfig';
import { getOfflineValue, putOfflineValue } from '../services/offlineStore';
import { getCurrentLocation } from '../services/nativeLocation';

// ===== 定位 =====

/**
 * 获取当前 GPS 定位点
 * Capacitor 原生定位优先，失败时由服务层降级到浏览器/默认坐标，避免阻断路线生成。
 */
export async function getCurrentPoint(): Promise<{ point: GeoPoint; accuracy: number | null; isFallback?: boolean }> {
  const location = await getCurrentLocation();
  return { point: location.point, accuracy: location.accuracy, isFallback: location.isFallback };
}

// ===== 路线创建 =====

/** 从模板图形创建路线（地图服务商来自后端配置，支持传入模板详情） */
export async function createTemplateRoute(
  shapeType: string,
  targetKm: number = 5,
  template?: Record<string, unknown> | null,
): Promise<GeneratedRoute> {
  const current = await getCurrentPoint();
  const provider = await getDefaultMapProvider();
  const payload = await apiPost<{ route?: GeneratedRoute }>('/routes/from-template', {
    shapeType,
    targetKm,
    provider,
    startPoint: current.point,
    currentAccuracy: current.accuracy,
    templateId: template?.id || null,
    templateCode: template?.templateCode || null,
  });
  if (!payload.route) throw new Error('route_missing');
  await putOfflineValue(`route:${payload.route.id}`, payload.route);
  return payload.route;
}

/** 从上传图片创建路线（FormData 上传，支持 targetKm/startPoint/currentAccuracy） */
export async function createImageRoute(file: File, targetKm: number = 5): Promise<GeneratedRoute> {
  const current = await getCurrentPoint();
  const provider = await getDefaultMapProvider();
  const body = new FormData();
  body.append('image', file);
  body.append('targetKm', String(targetKm));
  body.append('provider', provider);
  body.append('startPoint', JSON.stringify(current.point));
  if (current.accuracy !== null) {
    body.append('currentAccuracy', String(current.accuracy));
  }

  const payload = await apiRequest<{ route?: GeneratedRoute }>('/routes', {
    method: 'POST',
    body,
  });
  if (!payload.route) throw new Error('route_missing');
  await putOfflineValue(`route:${payload.route.id}`, payload.route);
  return payload.route;
}

// ===== 路线查询 =====

/** 获取单条路线详情 */
export async function getRoute(routeId: string): Promise<GeneratedRoute> {
  try {
    const payload = await apiGet<{ route?: GeneratedRoute }>(`/routes/${encodeURIComponent(routeId)}`);
    if (!payload.route) throw new Error('route_missing');
    await putOfflineValue(`route:${routeId}`, payload.route);
    return payload.route;
  } catch (error) {
    const cached = await getOfflineValue<GeneratedRoute>(`route:${routeId}`);
    if (cached) return cached;
    throw error;
  }
}

/** 分页查询路线列表，支持 status/search 过滤 */
export async function listUserRuns(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<{ runs: GeneratedRoute[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 1));
  params.set('limit', String(options.limit ?? 20));
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);
  const cacheKey = `runs:${params.toString()}`;
  try {
    const payload = await apiGet<{ runs?: GeneratedRoute[]; total?: number; page?: number; limit?: number }>(
      `/runs?${params.toString()}`,
    );
    const result = {
      runs: payload.runs || [],
      total: payload.total || 0,
      page: payload.page || 1,
      limit: payload.limit || 20,
    };
    await putOfflineValue(cacheKey, result);
    await Promise.all(result.runs.map((route) => putOfflineValue(`route:${route.id}`, route)));
    return result;
  } catch (error) {
    const cached = await getOfflineValue<{ runs: GeneratedRoute[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;
    throw error;
  }
}

// ===== 会话 =====

/** 开始跑步会话，返回 sessionId（支持风险确认标志） */
export async function startRoute(routeId: string, riskConfirmed: boolean): Promise<string> {
  const provider = await getDefaultMapProvider();
  const payload = await apiPost<{ sessionId?: string; session?: { id?: string } }>(
    `/routes/${encodeURIComponent(routeId)}/start`,
    { provider, riskConfirmed },
  );
  const sessionId = payload.sessionId || payload.session?.id;
  if (!sessionId) throw new Error('session_missing');
  return sessionId;
}

/** 获取会话实时状态（进度、偏离、下一步动作等） */
export async function getSessionState(sessionId: string): Promise<SessionState> {
  const payload = await apiGet<{ state?: SessionState }>(`/sessions/${encodeURIComponent(sessionId)}`);
  if (!payload.state) throw new Error('state_missing');
  return payload.state;
}

/** 上报实时位置点，返回更新后的会话状态 */
export async function reportLocation(
  sessionId: string,
  point: GeoPoint & { accuracy?: number | null },
): Promise<SessionState | null> {
  const payload = await apiPost<{ routeState?: SessionState }>(
    `/sessions/${encodeURIComponent(sessionId)}/location`,
    {
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy ?? null,
      ts: point.ts ?? Date.now(),
    },
  );
  return payload.routeState || null;
}

/** 结束跑步会话，返回完成率/平均偏离等统计结果 */
export async function finishSession(sessionId: string): Promise<FinishResult> {
  const payload = await apiPost<{ result?: FinishResult }>(
    `/sessions/${encodeURIComponent(sessionId)}/finish`,
    {},
  );
  if (!payload.result) throw new Error('result_missing');
  return payload.result;
}

/** 暂停跑步会话，返回更新后的会话状态 */
export async function pauseSession(sessionId: string): Promise<SessionState> {
  const payload = await apiPost<{ state?: SessionState }>(
    `/sessions/${encodeURIComponent(sessionId)}/pause`,
    {},
  );
  if (!payload.state) throw new Error('state_missing');
  return payload.state;
}

/** 恢复跑步会话，返回更新后的会话状态 */
export async function resumeSession(sessionId: string): Promise<SessionState> {
  const payload = await apiPost<{ state?: SessionState }>(
    `/sessions/${encodeURIComponent(sessionId)}/resume`,
    {},
  );
  if (!payload.state) throw new Error('state_missing');
  return payload.state;
}
