/**
 * TraceCraft 日期工具函数
 */

/** 将任意值安全转换为 ISO 8601 时间字符串，无效输入时返回当前时间 */
export function toIso(value: unknown): string {
  return value ? new Date(value as string | Date).toISOString() : new Date().toISOString();
}
