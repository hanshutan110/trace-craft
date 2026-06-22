/**
 * JSON 安全解析工具
 * 避免 JSON.parse 抛出异常，统一返回对象
 */

/**
 * 安全解析 JSON 字符串或对象
 * @param value - 待解析的值，支持字符串或对象，其他类型返回空对象
 * @returns 解析后的对象，解析失败返回空对象
 */
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
