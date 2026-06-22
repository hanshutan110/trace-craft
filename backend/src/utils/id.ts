/**
 * ID 生成工具
 * 生成格式：{prefix}-{时间戳36进制}-{随机hex}
 */
import crypto from 'crypto';

/**
 * 生成带前缀的唯一 ID
 * @param prefix - ID 前缀，如 'route'、'session'
 * @param bytes - 随机字节数（默认 4，生成 8 位 hex）
 */
export function newId(prefix: string, bytes: number = 4): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(bytes).toString('hex')}`;
}
