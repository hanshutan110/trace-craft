/**
 * TraceCraft Redis 连接管理
 *
 * 职责：
 *   - 管理 ioredis 连接生命周期
 *   - Redis 不可用时优雅降级，不阻断主服务
 *   - 导出 isConnected / getClient 供缓存、队列、限流模块使用
 */

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || '';

/** 全局 Redis 客户端（可能为 null，表示 Redis 不可用） */
let client: Redis | null = null;
let connected = false;
let initialized = false;

/**
 * 初始化 Redis 连接
 *
 * - lazyConnect 模式：创建客户端但不立即连接
 * - 手动 connect() 并捕获错误，失败时 client 置 null
 * - 所有依赖 Redis 的模块均通过 isConnected() 判断是否可用
 */
export async function initRedis(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!redisUrl) {
    console.log('[redis] no REDIS_URL configured, Redis features disabled');
    return;
  }

  try {
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // 最多重试 3 次
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
    });

    client.on('connect', () => {
      connected = true;
      console.log('[redis] connected');
    });
    client.on('close', () => {
      connected = false;
    });
    client.on('reconnecting', () => {
      connected = false;
    });
    client.on('error', (err: Error) => {
      connected = false;
      // ECONNREFUSED 等连接错误静默处理，不打印堆栈
      if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
        return;
      }
      console.warn('[redis:error]', err.message);
    });

    await client.connect();
  } catch {
    console.warn('[redis] connection failed, Redis features disabled');
    client = null;
    connected = false;
  }
}

/** Redis 是否可用 */
export function isRedisConnected(): boolean {
  return connected && client !== null;
}

/** 获取 Redis 客户端（可能为 null） */
export function getRedisClient(): Redis | null {
  return connected ? client : null;
}

/** 关闭 Redis 连接 */
export async function closeRedis(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      // 忽略关闭时的错误
    }
    client = null;
    connected = false;
  }
}
