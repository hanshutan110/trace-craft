/**
 * TraceCraft 公共服务工具函数单元测试
 *
 * 测试目标：common-utils.ts 中的通用函数
 *   - parseJson：安全 JSON 解析
 *   - normalizePage / normalizeLimit：分页参数标准化
 *   - toIso / nowIso：日期格式化
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseJson, normalizePage, normalizeLimit, toIso, nowIso } from '../src/services/common-utils';

// ===== parseJson =====

test('parseJson parses valid JSON string', () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
});

test('parseJson returns original value for non-string input', () => {
  const obj = { key: 'value' };
  assert.equal(parseJson(obj), obj);
  assert.equal(parseJson(42), 42);
  assert.equal(parseJson(null), null);
});

test('parseJson returns original string for invalid JSON', () => {
  assert.equal(parseJson('not json'), 'not json');
  assert.equal(parseJson('{broken'), '{broken');
});

// ===== normalizePage =====

test('normalizePage returns 1 for undefined or NaN', () => {
  assert.equal(normalizePage(undefined), 1);
  assert.equal(normalizePage(NaN), 1);
});

test('normalizePage floors and clamps to minimum 1', () => {
  assert.equal(normalizePage(3.7), 3);
  assert.equal(normalizePage(0), 1);
  assert.equal(normalizePage(-5), 1);
  assert.equal(normalizePage(100), 100);
});

// ===== normalizeLimit =====

test('normalizeLimit uses fallback for non-finite input', () => {
  assert.equal(normalizeLimit(undefined), 20);
  assert.equal(normalizeLimit(NaN), 20);
  assert.equal(normalizeLimit('abc'), 20);
});

test('normalizeLimit respects custom fallback and max', () => {
  assert.equal(normalizeLimit(undefined, 30), 30);
  assert.equal(normalizeLimit(200, 20, 100), 100);
  assert.equal(normalizeLimit(50, 20, 100), 50);
});

test('normalizeLimit floors and clamps to minimum 1', () => {
  assert.equal(normalizeLimit(0), 1);
  assert.equal(normalizeLimit(-3), 1);
  assert.equal(normalizeLimit(3.9), 3);
});

// ===== toIso / nowIso =====

test('toIso converts Date to ISO string', () => {
  const result = toIso('2024-01-15T10:00:00Z');
  assert.equal(result, '2024-01-15T10:00:00.000Z');
});

test('toIso returns current time for falsy input', () => {
  const result = toIso(null);
  assert.ok(result.includes('T'));
});

test('nowIso returns valid ISO string', () => {
  const result = nowIso();
  assert.ok(result.endsWith('Z'));
  assert.ok(new Date(result).getTime() > 0);
});
