/**
 * TraceCraft 路线相关 API
 *
 * 使用统一 apiClient 封装，去除重复的 API_BASE / authHeaders 定义
 */
import type { FinishResult, GeneratedRoute, GeoPoint, SessionState } from '../types';
import { apiGet, apiPost, apiRequest } from './client';

// ===== 定位 =====

/** 获取当前 GPS 位置，失败时抛出 location_required 错误 */
export async function getCurrentPoint(): Promise<{ point: GeoPoint; accuracy: number | null }> {
  if (!navigator.geolocation) throw new Error('location_required');

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      () => reject(new Error('location_required')),
      {
        enableHighAccuracy: true,
        timeout: 3500,
        maximumAge: 30000,
      },
    );
  });
}

// ===== 路线创建 =====

/** 通过模板形状创建路线（自动获取当前位置作为起点） */
export async function createTemplateRoute(shapeType: string, targetKm: number = 5): Promise<GeneratedRoute> {
  const current = await getCurrentPoint();
  const payload = await apiPost<{ route?: GeneratedRoute }>('/routes/from-template', {
    shapeType,
    targetKm,
    provider: 'amap',
    startPoint: current.point,
    currentAccuracy: current.accuracy,
  });
  if (!payload.route) throw new Error('route_missing');
  return payload.route;
}

/** 通过上传图片创建路线（提取图片轮廓生成路线） */
export async function createImageRoute(file: File, targetKm: number = 5): Promise<GeneratedRoute> {
  const current = await getCurrentPoint();
  const body = new FormData();
  body.append('image', file);
  body.append('targetKm', String(targetKm));
  body.append('provider', 'amap');
  body.append('startPoint', JSON.stringify(current.point));
  if (current.accuracy !== null) {
    body.append('currentAccuracy', String(current.accuracy));
  }

  const payload = await apiRequest<{ route?: GeneratedRoute }>('/routes', {
    method: 'POST',
    body,
  });
  if (!payload.route) throw new Error('route_missing');
  return payload.route;
}

// ===== 路线查询 =====

/** 根据 ID 获取单条路线详情 */
export function getRoute(routeId: string): Promise<GeneratedRoute> {
  return apiGet<{ route?: GeneratedRoute }>(`/routes/${encodeURIComponent(routeId)}`)
    .then((p) => {
      if (!p.route) throw new Error('route_missing');
      return p.route;
    });
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
  const payload = await apiGet<{ runs?: GeneratedRoute[]; total?: number; page?: number; limit?: number }>(
    `/runs?${params.toString()}`,
  );
  return {
    runs: payload.runs || [],
    total: payload.total || 0,
    page: payload.page || 1,
    limit: payload.limit || 20,
  };
}

// ===== 会话管理 =====

/** 开始跑步会话，返回会话 ID（支持风险确认拦截） */
export async function startRoute(routeId: string, riskConfirmed: boolean): Promise<string> {
  const payload = await apiPost<{ sessionId?: string; session?: { id?: string } }>(
    `/routes/${encodeURIComponent(routeId)}/start`,
    { provider: 'amap', riskConfirmed },
  );
  const sessionId = payload.sessionId || payload.session?.id;
  if (!sessionId) throw new Error('session_missing');
  return sessionId;
}

/** 获取跑步会话实时状态 */
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

/** 结束跑步会话，返回成绩汇总数据 */
export async function finishSession(sessionId: string): Promise<FinishResult> {
  const payload = await apiPost<{ result?: FinishResult }>(
    `/sessions/${encodeURIComponent(sessionId)}/finish`,
    {},
  );
  if (!payload.result) throw new Error('result_missing');
  return payload.result;
}
