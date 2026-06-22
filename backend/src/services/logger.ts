/**
 * 结构化日志服务
 *
 * 输出 JSON 格式日志，包含时间戳、级别、事件名、服务标识
 * 错误日志写入 stderr，其他写入 stdout
 * 生产环境隐藏错误堆栈，开发环境输出完整堆栈
 */

/** 日志级别 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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

/** 日志写入核心函数 */
function write(level: LogLevel, event: string, context: LogContext = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    service: 'tracecraft-backend',
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    process.stderr.write(`${line}\n`);
    return;
  }
  process.stdout.write(`${line}\n`);
}

/** 日志记录器实例（全局使用） */
export const logger = {
  debug(event: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'debug') write('debug', event, context);
  },
  info(event: string, context?: LogContext): void {
    write('info', event, context);
  },
  warn(event: string, context?: LogContext): void {
    write('warn', event, context);
  },
  error(event: string, error: unknown, context: LogContext = {}): void {
    write('error', event, { ...context, ...serializeError(error) });
  },
};
