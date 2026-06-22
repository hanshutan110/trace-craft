/**
 * 地图配置 API
 *
 * 从后端获取地图服务商配置，支持缓存、降级和运行时切换
 * 用户可通过 setMapProvider() 切换服务商，选择会持久化到 localStorage
 */

import type { MapProvider } from '../types';
import { apiGet } from './client';

/** 地图配置响应载荷 */
interface MapConfigPayload {
  [key: string]: unknown;
  defaultProvider?: string;
  providers?: Array<{ key?: string; enabled?: boolean; hasApiKey?: boolean }>;
}

/** localStorage 存储键 */
const PROVIDER_STORAGE_KEY = 'tracecraft_map_provider';

/** 已缓存的地图服务商（避免重复请求） */
let cachedProvider: MapProvider | null = null;

/** 已缓存的可用服务商列表 */
let cachedProviders: Array<{ key: MapProvider; hasApiKey: boolean }> | null = null;

/** 标准化服务商名称，非法值返回 null */
function normalizeProvider(value: unknown): MapProvider | null {
  return value === 'amap' || value === 'google' || value === 'baidu' ? value : null;
}

/** 从 localStorage 读取用户选择的服务商 */
function readStoredProvider(): MapProvider | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeProvider(localStorage.getItem(PROVIDER_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** 将用户选择的服务商写入 localStorage */
function writeStoredProvider(provider: MapProvider): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  } catch {
    // localStorage 不可用时静默忽略
  }
}

/**
 * 获取当前地图服务商
 * 优先级：用户选择（localStorage）> 后端配置默认 > amap
 */
export async function getDefaultMapProvider(): Promise<MapProvider> {
  // 1. 检查用户是否已选择
  const stored = readStoredProvider();
  if (stored) {
    cachedProvider = stored;
    return stored;
  }

  // 2. 检查内存缓存
  if (cachedProvider) return cachedProvider;

  // 3. 从后端获取默认配置
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

/**
 * 切换地图服务商（运行时切换）
 * 持久化到 localStorage，后续所有路线生成和导航将使用新服务商
 */
export function setMapProvider(provider: MapProvider): void {
  const normalized = normalizeProvider(provider);
  if (!normalized) return;
  writeStoredProvider(normalized);
  cachedProvider = normalized;
}

/**
 * 获取可用的地图服务商列表
 * 从后端配置获取，仅返回已配置 API Key 的服务商
 */
export async function getAvailableProviders(): Promise<Array<{ key: MapProvider; label: string; hasApiKey: boolean }>> {
  if (cachedProviders) {
    return cachedProviders.map((p) => ({
      key: p.key,
      label: PROVIDER_LABELS[p.key] || p.key,
      hasApiKey: p.hasApiKey,
    }));
  }

  try {
    const config = await apiGet<MapConfigPayload>('/maps/config');
    const providers = (config.providers || [])
      .filter((item) => item.enabled !== false)
      .map((item) => ({
        key: normalizeProvider(item.key),
        hasApiKey: item.hasApiKey !== false,
      }))
      .filter((item): item is { key: MapProvider; hasApiKey: boolean } => item.key !== null);

    cachedProviders = providers;
    return providers.map((p) => ({
      key: p.key,
      label: PROVIDER_LABELS[p.key] || p.key,
      hasApiKey: p.hasApiKey,
    }));
  } catch {
    // 降级：返回默认 amap
    return [{ key: 'amap', label: '高德地图', hasApiKey: true }];
  }
}

/** 服务商显示名称 */
const PROVIDER_LABELS: Record<MapProvider, string> = {
  amap: '高德地图',
  google: 'Google Maps',
  baidu: '百度地图',
};

/** 获取服务商显示名称 */
export function getProviderLabel(provider: MapProvider): string {
  return PROVIDER_LABELS[provider] || provider;
}

/** 清除服务商缓存（用于注销或重置） */
export function clearMapProviderCache(): void {
  cachedProvider = null;
  cachedProviders = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(PROVIDER_STORAGE_KEY);
    } catch {
      // 静默忽略
    }
  }
}
