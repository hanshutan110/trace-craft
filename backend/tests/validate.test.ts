/**
 * Zod 输入验证中间件测试
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { schemas } from '../src/middleware/validate';

describe('Zod 验证 Schema', () => {
  describe('createTemplateRouteSchema', () => {
    it('应接受有效的模板路线请求', () => {
      const valid = {
        shapeType: 'star',
        startPoint: { lat: 39.9087, lng: 116.3975 },
        targetKm: 5,
      };
      const result = schemas.createTemplateRoute.safeParse(valid);
      assert.ok(result.success, '应验证通过');
    });

    it('应拒绝缺少 shapeType 的请求', () => {
      const invalid = {
        startPoint: { lat: 39.9087, lng: 116.3975 },
      };
      const result = schemas.createTemplateRoute.safeParse(invalid);
      assert.ok(!result.success, '应验证失败');
    });

    it('应拒绝缺少 startPoint 的请求', () => {
      const invalid = {
        shapeType: 'star',
      };
      const result = schemas.createTemplateRoute.safeParse(invalid);
      assert.ok(!result.success, '应验证失败');
    });

    it('应拒绝超出范围的 targetKm', () => {
      const invalid = {
        shapeType: 'star',
        startPoint: { lat: 39.9087, lng: 116.3975 },
        targetKm: 100,
      };
      const result = schemas.createTemplateRoute.safeParse(invalid);
      assert.ok(!result.success, '应验证失败');
    });

    it('应拒绝无效的经纬度', () => {
      const invalid = {
        shapeType: 'star',
        startPoint: { lat: 200, lng: 116.3975 },
      };
      const result = schemas.createTemplateRoute.safeParse(invalid);
      assert.ok(!result.success, '应验证失败');
    });
  });

  describe('smsCodeSchema', () => {
    it('应接受 11 位手机号', () => {
      const result = schemas.smsCode.safeParse({ phone: '13800138000' });
      assert.ok(result.success, '应验证通过');
    });

    it('应拒绝非 11 位手机号', () => {
      const result = schemas.smsCode.safeParse({ phone: '1380013800' });
      assert.ok(!result.success, '应验证失败');
    });

    it('应拒绝包含非数字的手机号', () => {
      const result = schemas.smsCode.safeParse({ phone: '1380013800a' });
      assert.ok(!result.success, '应验证失败');
    });
  });

  describe('phoneLoginSchema', () => {
    it('应接受有效的手机号登录请求', () => {
      const result = schemas.phoneLogin.safeParse({
        phone: '13800138000',
        smsCode: '8888',
      });
      assert.ok(result.success, '应验证通过');
    });

    it('应拒绝过长的验证码', () => {
      const result = schemas.phoneLogin.safeParse({
        phone: '13800138000',
        smsCode: '1234567',
      });
      assert.ok(!result.success, '应验证失败');
    });
  });

  describe('reportLocationSchema', () => {
    it('应接受有效的位置上报', () => {
      const result = schemas.reportLocation.safeParse({
        lat: 39.9087,
        lng: 116.3975,
        accuracy: 10,
        ts: Date.now(),
      });
      assert.ok(result.success, '应验证通过');
    });

    it('应接受无 accuracy 的位置上报', () => {
      const result = schemas.reportLocation.safeParse({
        lat: 39.9087,
        lng: 116.3975,
      });
      assert.ok(result.success, '应验证通过');
    });

    it('应拒绝无效的纬度', () => {
      const result = schemas.reportLocation.safeParse({
        lat: 91,
        lng: 116.3975,
      });
      assert.ok(!result.success, '应验证失败');
    });
  });

  describe('quickLoginSchema', () => {
    it('应接受微信快捷登录', () => {
      const result = schemas.quickLogin.safeParse({
        provider: 'wechat',
        deviceId: 'device-123',
      });
      assert.ok(result.success, '应验证通过');
    });

    it('应拒绝不支持的 provider', () => {
      const result = schemas.quickLogin.safeParse({
        provider: 'twitter',
        deviceId: 'device-123',
      });
      assert.ok(!result.success, '应验证失败');
    });

    it('应拒绝缺少 deviceId 的请求', () => {
      const result = schemas.quickLogin.safeParse({
        provider: 'wechat',
      });
      assert.ok(!result.success, '应验证失败');
    });
  });

  describe('adjustRouteSchema', () => {
    it('应接受有效的目标距离', () => {
      const result = schemas.adjustRoute.safeParse({ targetKm: 5 });
      assert.ok(result.success, '应验证通过');
    });

    it('应拒绝小于 1km 的目标距离', () => {
      const result = schemas.adjustRoute.safeParse({ targetKm: 0.5 });
      assert.ok(!result.success, '应验证失败');
    });

    it('应拒绝大于 50km 的目标距离', () => {
      const result = schemas.adjustRoute.safeParse({ targetKm: 60 });
      assert.ok(!result.success, '应验证失败');
    });
  });
});
