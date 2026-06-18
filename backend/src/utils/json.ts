/**
 * TraceCraft JSON 工具函数
 *
 * 提供安全的 JSON 解析能力，避免运行时异常
 */

/** 安全解析 JSON 字符串，返回对象或空对象，不会抛出异常 */
export function safeJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * 安全解析 JSON 泛型函数
 * 输入为字符串时尝试解析，失败或非法输入时原样返回
 */
export function safeJsonParse<T>(value: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}
