/**
 * TraceCraft Redis 缓存层
 *
 * 职责：
 *   - 地图配置缓存（减少重复计算）
 *   - 搜索结果缓存（减少数据库查询）
 *   - Redis 不可用时自动降级为直接调用
 */

import { getRedisClient } from './redisService';

const CACHE_PREFIX = 'tc:cache:';

/** 通用缓存读取（JSON 反序列化），失败返回 null */
async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 通用缓存写入（JSON 序列化 + TTL），失败静默忽略 */
async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.set(`${CACHE_PREFIX}${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // 缓存写入失败不影响主流程
  }
}

/** 删除缓存条目 */
export async function cacheDelete(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(`${CACHE_PREFIX}${key}`);
  } catch {
    // 忽略
  }
}

// ===== 地图配置缓存 =====

/** 获取缓存的地图配置，未命中返回 null */
export async function getCachedMapConfig(): Promise<Record<string, unknown> | null> {
  return cacheGet<Record<string, unknown>>('map-config');
}

/** 写入地图配置缓存（TTL 5 分钟） */
export async function setCachedMapConfig(config: Record<string, unknown>, ttlSeconds: number = 300): Promise<void> {
  await cacheSet('map-config', config, ttlSeconds);
}

// ===== 搜索结果缓存 =====

/** 获取缓存的搜索结果，未命中返回 null */
export async function getCachedSearchResults(
  userId: string,
  query: string,
  scope: string,
): Promise<unknown[] | null> {
  const key = `search:${userId}:${query}:${scope}`;
  return cacheGet<unknown[]>(key);
}

/** 写入搜索结果缓存（TTL 2 分钟） */
export async function setCachedSearchResults(
  userId: string,
  query: string,
  scope: string,
  results: unknown[],
  ttlSeconds: number = 120,
): Promise<void> {
  const key = `search:${userId}:${query}:${scope}`;
  await cacheSet(key, results, ttlSeconds);
}

// ===== 通用 KV 缓存 =====

/** 通用缓存获取（带 fallback 计算函数） */
export async function getOrCompute<T>(
  key: string,
  ttlSeconds: number,
  compute: () => T | Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
