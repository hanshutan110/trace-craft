import type { RequestHandler } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../services/redisService';

type RateLimitOptions = Partial<Options>;

function buildLimiter(options: RateLimitOptions): RequestHandler {
  const redisClient = getRedisClient();
  return rateLimit({
    ...options,
    store: redisClient
      ? new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(...args as [string, ...string[]]) as any })
      : options.store,
  });
}

/** Redis 初始化后按首次请求创建 limiter，Redis 不可用时自动使用内存存储。 */
export function createRedisAwareRateLimiter(options: RateLimitOptions): RequestHandler {
  let limiter: RequestHandler | null = null;
  return (req, res, next) => {
    if (!limiter) {
      limiter = buildLimiter(options);
    }
    limiter(req, res, next);
  };
}
