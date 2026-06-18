import crypto from 'crypto';

export function newId(prefix: string, bytes: number = 4): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(bytes).toString('hex')}`;
}
