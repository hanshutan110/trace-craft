/**
 * 日期工具模块
 * 提供安全的 ISO 时间字符串转换
 */

/**
 * 将任意值安全转换为 ISO 时间字符串
 * @param value - 可解析为日期的值，为空时返回当前时间
 */
export function toIso(value: unknown): string {
  return value ? new Date(value as string | Date).toISOString() : new Date().toISOString();
}
