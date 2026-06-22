/**
 * 结构化日志服务（基于 Winston）
 *
 * 特性：
 *   - JSON 格式输出，包含时间戳、级别、事件名、服务标识
 *   - 支持日志级别过滤（LOG_LEVEL=debug|info|warn|error，默认 info）
 *   - 生产环境隐藏错误堆栈，开发环境输出完整堆栈
 *   - 错误日志写入 stderr，其他写入 stdout
 *   - 保持与旧版自定义 logger 相同的 API 接口，零侵入替换
 */

import winston from 'winston';

/** 日志上下文（附加信息键值对） */
export interface LogContext {
  [key: string]: unknown;
}

/** 序列化错误对象，生产环境隐藏堆栈信息 */
function serializeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { error };
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
}

/** 日志级别（从环境变量读取，默认 info） */
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/** Winston 日志实例 */
const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: () => new Date().toISOString() }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'tracecraft-backend' },
  transports: [
    // error 级别写入 stderr
    new winston.transports.Console({
      level: 'error',
      stderrLevels: ['error'],
      format: winston.format.combine(
        winston.format.timestamp({ format: () => new Date().toISOString() }),
        winston.format.json(),
      ),
    }),
    // 其他级别写入 stdout
    new winston.transports.Console({
      level: LOG_LEVEL,
      stderrLevels: [],
      format: winston.format.combine(
        winston.format.timestamp({ format: () => new Date().toISOString() }),
        winston.format.json(),
      ),
    }),
  ],
});

/**
 * 日志记录器实例（与旧版 API 完全兼容）
 *
 * 用法：
 *   logger.info('server_started', { port: 3017 });
 *   logger.error('route_create_failed', err, { routeId: 'xxx' });
 *   logger.warn('upload_cleanup_failed', { message: 'file not found' });
 *   logger.debug('cache_hit', { key: 'maps_config' });
 */
export const logger = {
  debug(event: string, context?: LogContext): void {
    winstonLogger.debug(event, context || {});
  },

  info(event: string, context?: LogContext): void {
    winstonLogger.info(event, context || {});
  },

  warn(event: string, context?: LogContext): void {
    winstonLogger.warn(event, context || {});
  },

  error(event: string, error: unknown, context: LogContext = {}): void {
    winstonLogger.error(event, { ...context, ...serializeError(error) });
  },
};
