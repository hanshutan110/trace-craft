import type { GeoPoint } from '../../../shared/types';

/** 标准化坐标点：验证经纬度合法性，保留 8 位小数精度 */
export function normalizePoint(point: unknown): GeoPoint | null {
  if (!point || typeof point !== 'object') return null;
  const p = point as Record<string, unknown>;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: Number(lat.toFixed(8)),
    lng: Number(lng.toFixed(8)),
  };
}

/** 批量标准化坐标点 */
export function normalizePoints(points: unknown[]): GeoPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .map(normalizePoint)
    .filter((p): p is GeoPoint => p !== null)
    .map((p) => ({ lat: p.lat, lng: p.lng, ts: Date.now() }));
}
