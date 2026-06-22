/**
 * TraceCraft CSRF 中间件单元测试
 *
 * 测试目标：middleware/csrf.ts
 *   - generateCsrfToken：生成随机 Token
 *   - csrfProtection：安全方法放行、非安全方法校验
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateCsrfToken } from '../src/middleware/csrf';

test('generateCsrfToken returns base64url string', () => {
  const token = generateCsrfToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 16);
  // base64url 字符集
  assert.ok(/^[A-Za-z0-9_-]+$/.test(token));
});

test('generateCsrfToken produces unique tokens', () => {
  const tokens = new Set(Array.from({ length: 50 }, () => generateCsrfToken()));
  assert.equal(tokens.size, 50);
});
