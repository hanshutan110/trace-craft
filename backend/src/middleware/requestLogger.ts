/**
 * 请求日志中间件
 *
 * 记录每个 HTTP 请求的耗时、状态码、用户 ID 等信息
 * 跳过健康检查和静态资源请求，减少日志噪音
 */
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../services/logger';

/** 跳过不需要记录的路径（健康检查、静态资源） */
function shouldSkip(req: Request): boolean {
  return req.path === '/health' || req.path.startsWith('/uploads');
}

/** 记录 API 耗时和状态码，供后续接入日志平台/告警系统聚合。 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkip(req)) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const context = {
      traceId: req.traceId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: req.userId || undefined,
      ip: req.ip,
    };
    if (res.statusCode >= 500) {
      logger.error('http_request', new Error('http_5xx_response'), context);
      return;
    }
    if (res.statusCode >= 400) {
      logger.warn('http_request', context);
      return;
    }
    logger.info('http_request', context);
  });
  next();
}
