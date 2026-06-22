/**
 * TraceCraft 后端公共服务工具函数
 *
 * 拆分来源：communityService.ts、discoveryService.ts、profileService.ts 中的重复工具函数
 * 变更目的：消除跨模块的重复代码，统一维护公共逻辑
 *
 * 包含：
 *   - requireDb：数据库连接池检查
 *   - ensureUser：确保用户记录存在
 *   - parseJson：安全 JSON 解析
 *   - toIso：日期转 ISO 字符串
 *   - normalizePage / normalizeLimit：分页参数标准化
 *   - nowIso：当前时间 ISO 字符串
 */

import { pgPool } from './postgres-storage';

/** 检查 PostgreSQL 连接池是否就绪 */
export function requireDb(): void {
  if (!pgPool) throw new Error('postgres_not_configured');
}

/** 确保 users 表中存在指定用户（幂等操作） */
export async function ensureUser(userId: string): Promise<void> {
  await pgPool!.query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [userId]);
}

/** 安全解析 JSON 字符串，解析失败返回原值 */
export function parseJson<T>(value: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

/** 将任意日期值转为 ISO 字符串，无效时返回当前时间 */
export function toIso(value: unknown): string {
  return value ? new Date(value as string | Date).toISOString() : new Date().toISOString();
}

/** 标准化分页页码（最小为 1） */
export function normalizePage(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(Number(value))) : 1;
}

/** 标准化分页条数（范围 1-max，默认 fallback） */
export function normalizeLimit(value: unknown, fallback: number = 20, max: number = 50): number {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(1, Math.min(max, Math.floor(num))) : fallback;
}

/** 获取当前时间的 ISO 字符串 */
export function nowIso(): string {
  return new Date().toISOString();
}
