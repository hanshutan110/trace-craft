/**
 * TraceCraft 统一 ID 生成器
 *
 * 格式：`{prefix}-{timestamp36}-{randomHex}`
 * 示例：`route-m1abc-3f8a2b1c`
 */

import crypto from 'crypto';

/** 生成带前缀的唯一 ID，用于路线、会话、用户等实体 */
export function newId(prefix: string, bytes: number = 4): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(bytes).toString('hex')}`;
}
