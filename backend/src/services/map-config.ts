/**
 * TraceCraft 地图配置模块
 *
 * 管理地图服务商、语言配置、坐标转换策略
 */

import crypto from 'crypto';
import type { GeoPoint } from '../../../shared/types';
import { convertPoint } from '../utils/coordAdapter';
import { getCachedMapConfig, setCachedMapConfig } from './cacheService';

// ===== 常量 =====

/** 默认地图服务商 */
export const DEFAULT_PROVIDER: string = process.env.MAP_PROVIDER_DEFAULT || 'amap';

/** 支持的地图服务商列表 */
export const MAP_PROVIDER_LIST: string[] = (process.env.MAP_PROVIDER_LIST || 'amap,google,baidu')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

/** 默认语言 */
export const DEFAULT_LOCALE: string = process.env.MAP_LOCALE_FALLBACK || 'zh-CN';

const LOCALE_LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
};

/** 服务商功能特性 */
interface ProviderFeatures {
  supportPoi: boolean;
  offlineTile: boolean;
  navHints: boolean;
  geocode?: boolean;
}

const PROVIDER_FEATURES: Record<string, ProviderFeatures> = {
  amap: { supportPoi: true, offlineTile: false, navHints: true, geocode: true },
  google: { supportPoi: true, offlineTile: false, navHints: true, geocode: true },
  baidu: { supportPoi: true, offlineTile: false, navHints: true },
};

const PROVIDER_KEY_ENV: Record<string, string> = {
  amap: 'AMAP_KEY',
  google: 'GOOGLE_MAPS_KEY',
  baidu: 'BAIDU_MAP_KEY',
};

// ===== 语言配置 =====

function splitList(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const SUPPORTED_LOCALES: string[] = (() => {
  const locales = splitList(process.env.MAP_LOCALES || 'zh-CN,en-US');
  const uniq = [...new Set(locales)];
  return uniq.length ? uniq : ['zh-CN', 'en-US'];
})();

function withLocaleFallback(fallback: string): string {
  return SUPPORTED_LOCALES.includes(fallback) ? fallback : (SUPPORTED_LOCALES[0] || 'zh-CN');
}

function parseLocaleLabels(value: string): Record<string, string> {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

// ===== 导出函数 =====

/** 标准化地图服务商名称 */
export function normalizeProvider(value: string | undefined | null): string {
  if (!value) return DEFAULT_PROVIDER;
  if (MAP_PROVIDER_LIST.includes(value)) return value;
  return DEFAULT_PROVIDER;
}

/** 标准化语言代码 */
export function normalizeLocale(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return DEFAULT_LOCALE;
  const normalized = value.trim();
  if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  return withLocaleFallback(DEFAULT_LOCALE);
}

/** 获取语言元数据 */
export function getLocaleMeta() {
  const safeDefault = withLocaleFallback(DEFAULT_LOCALE);
  const labelsFromEnv = parseLocaleLabels(process.env.MAP_LOCALE_LABELS || '');
  const locales = SUPPORTED_LOCALES.length > 0 ? SUPPORTED_LOCALES : ['zh-CN', 'en-US'];
  return {
    localeFallback: safeDefault,
    locales,
    localeLabels: locales.map((code) => ({
      code,
      label: labelsFromEnv[code] || LOCALE_LABELS[code] || code,
    })),
    localeVersion: process.env.MAP_LOCALE_LABEL_VERSION || 'v1',
  };
}

/** 获取地图配置信息 */
export function getMapConfig() {
  const providers = MAP_PROVIDER_LIST.map((key) => {
    const envKey = PROVIDER_KEY_ENV[key];
    const hasApiKey = Boolean(process.env[envKey]);
    return {
      key,
      features: PROVIDER_FEATURES[key] || {},
      keyRequired: Boolean(envKey),
      hasApiKey,
    };
  });
  const version = crypto
    .createHash('md5')
    .update(
      JSON.stringify({
        providers,
        defaultProvider: DEFAULT_PROVIDER,
        localeMeta: getLocaleMeta(),
      })
    )
    .digest('hex');

  return {
    providers,
    defaultProvider: DEFAULT_PROVIDER,
    ...getLocaleMeta(),
    crsPolicy: {
      internal: 'wgs84' as const,
      domesticHint: 'gcj02' as const,
    },
    mapConfigVersion: version,
    cacheSeconds: Number(process.env.MAP_CONFIG_CACHE_SECONDS || '300'),
    updatedAt: new Date().toISOString(),
  };
}

/** 获取地图配置信息（带 Redis 缓存，TTL 5 分钟） */
export async function getMapConfigCached() {
  const cached = await getCachedMapConfig();
  if (cached) return cached;
  const config = getMapConfig();
  await setCachedMapConfig(config, config.cacheSeconds);
  return config;
}

/** 将 WGS84 坐标按服务商转换为对应坐标系 */
export function seedWgs84ToProvider(point: GeoPoint, provider: string | undefined): GeoPoint {
  const providerNorm = normalizeProvider(provider);
  const converted =
    providerNorm === 'google'
      ? { lat: point.lat, lng: point.lng }
      : convertPoint(point, 'wgs84', 'gcj02');
  return converted || point;
}

export { splitList };
