/**
 * TraceCraft CSRF 中间件单元测试
 *
 * 测试目标：middleware/csrf.ts
 *   - generateCsrfToken：生成随机 Token
 *   - csrfProtection：安全方法放行、非安全方法校验
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csrfProtection, generateCsrfToken } from '../src/middleware/csrf';

test('generateCsrfToken returns hex string', () => {
  const token = generateCsrfToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 16);
  assert.ok(/^[a-f0-9]+$/.test(token));
});

test('generateCsrfToken produces unique tokens', () => {
  const tokens = new Set(Array.from({ length: 50 }, () => generateCsrfToken()));
  assert.equal(tokens.size, 50);
});

function runCsrf(method: string, headers: Record<string, string>): { statusCode?: number; body?: unknown; nextCalled: boolean } {
  const result: { statusCode?: number; body?: unknown; nextCalled: boolean } = { nextCalled: false };
  const req = { method, headers } as Parameters<typeof csrfProtection>[0];
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as Parameters<typeof csrfProtection>[1];
  csrfProtection(req, res, () => {
    result.nextCalled = true;
  });
  return result;
}

test('csrfProtection rejects multipart POST without token', () => {
  const result = runCsrf('POST', { 'content-type': 'multipart/form-data; boundary=abc' });
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
});

test('csrfProtection accepts multipart POST with matching cookie and header token', () => {
  const token = generateCsrfToken();
  const result = runCsrf('POST', {
    'content-type': 'multipart/form-data; boundary=abc',
    cookie: `tc_csrf=${encodeURIComponent(token)}`,
    'x-csrf-token': token,
  });
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, undefined);
});
