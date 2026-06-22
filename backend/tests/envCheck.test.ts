/**
 * 环境变量校验测试
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/services/envCheck';

/** 备份和恢复环境变量 */
const originalEnv = { ...process.env };

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe('环境变量校验', () => {
  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = { ...originalEnv };
  });

  describe('开发模式', () => {
    it('开发模式下不应阻止启动', () => {
      process.env.NODE_ENV = 'development';
      const result = validateEnv();
      assert.ok(result.valid, '开发模式应通过校验');
      assert.equal(result.errors.length, 0, '不应有错误');
    });

    it('开发模式下允许开启 dev 认证', () => {
      process.env.NODE_ENV = 'development';
      process.env.TRACECRAFT_ALLOW_DEV_AUTH = '1';
      const result = validateEnv();
      assert.ok(result.valid, '应通过校验');
    });
  });

  describe('生产模式', () => {
    it('生产模式缺少必需密钥应失败', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.TRACECRAFT_USER_TOKEN_SECRET;
      delete process.env.TRACECRAFT_USER_REFRESH_TOKEN_SECRET;
      delete process.env.TRACECRAFT_ADMIN_TOKEN_SECRET;
      delete process.env.DATABASE_URL;
      const result = validateEnv();
      assert.ok(!result.valid, '应校验失败');
      assert.ok(result.errors.length > 0, '应有错误信息');
    });

    it('生产模式使用弱密钥应失败', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRACECRAFT_USER_TOKEN_SECRET = 'replace-with-secret';
      process.env.TRACECRAFT_USER_REFRESH_TOKEN_SECRET = 'change-me-refresh-secret';
      process.env.TRACECRAFT_ADMIN_TOKEN_SECRET = 'replace-with-admin-secret';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      const result = validateEnv();
      assert.ok(!result.valid, '弱密钥应校验失败');
    });

    it('生产模式开启 dev 认证应失败', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRACECRAFT_USER_TOKEN_SECRET = 'a'.repeat(32);
      process.env.TRACECRAFT_USER_REFRESH_TOKEN_SECRET = 'b'.repeat(32);
      process.env.TRACECRAFT_ADMIN_TOKEN_SECRET = 'c'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.TRACECRAFT_ALLOW_DEV_AUTH = '1';
      const result = validateEnv();
      assert.ok(!result.valid, '生产模式开启 dev 认证应失败');
    });

    it('生产模式正确配置应通过', () => {
      process.env.NODE_ENV = 'production';
      process.env.TRACECRAFT_USER_TOKEN_SECRET = 'a'.repeat(32);
      process.env.TRACECRAFT_USER_REFRESH_TOKEN_SECRET = 'b'.repeat(32);
      process.env.TRACECRAFT_ADMIN_TOKEN_SECRET = 'c'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      delete process.env.TRACECRAFT_ALLOW_DEV_AUTH;
      delete process.env.TRACECRAFT_ALLOW_ADMIN_PASSWORD_FALLBACK;
      const result = validateEnv();
      assert.ok(result.valid, '正确配置应通过校验');
    });
  });

  describe('推荐配置警告', () => {
    it('缺少 Redis 应产生警告', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REDIS_URL;
      const result = validateEnv();
      const hasRedisWarning = result.warnings.some((w) => w.includes('REDIS_URL'));
      assert.ok(hasRedisWarning, '应有 Redis 警告');
    });

    it('缺少 AMAP_KEY 应产生警告', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.AMAP_KEY;
      const result = validateEnv();
      const hasAmapWarning = result.warnings.some((w) => w.includes('AMAP_KEY'));
      assert.ok(hasAmapWarning, '应有 AMAP_KEY 警告');
    });
  });
});
