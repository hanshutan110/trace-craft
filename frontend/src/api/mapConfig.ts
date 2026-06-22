/**
 * 地图配置 API
 *
 * 从后端获取地图服务商配置，支持缓存和降级
 */
import type { MapProvider } from '../types';
import { apiGet } from './client';

/** 地图配置响应载荷 */
interface MapConfigPayload {
  [key: string]: unknown;
  defaultProvider?: string;
  providers?: Array<{ key?: string; enabled?: boolean }>;
}

/** 已缓存的地图服务商（避免重复请求） */
let cachedProvider: MapProvider | null = null;

/** 标准化服务商名称，非法值返回 null */
function normalizeProvider(value: unknown): MapProvider | null {
  return value === 'amap' || value === 'google' || value === 'baidu' ? value : null;
}

/** 读取后端地图配置；失败时降级到 amap，避免阻断路线生成。 */
export async function getDefaultMapProvider(): Promise<MapProvider> {
  if (cachedProvider) return cachedProvider;
  try {
    const config = await apiGet<MapConfigPayload>('/maps/config');
    const configured = normalizeProvider(config.defaultProvider);
    if (configured) {
      cachedProvider = configured;
      return configured;
    }
    const firstEnabled = config.providers?.find((item) => item.enabled !== false);
    cachedProvider = normalizeProvider(firstEnabled?.key) || 'amap';
    return cachedProvider;
  } catch {
    cachedProvider = 'amap';
    return cachedProvider;
  }
}
