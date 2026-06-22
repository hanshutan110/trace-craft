/**
 * 请求体验证中间件（基于 Zod）
 *
 * 用法：
 *   import { validateBody, schemas } from '../middleware/validate';
 *   router.post('/routes/from-template', validateBody(schemas.createTemplateRoute), handler);
 *
 * 验证失败时返回 400 + 字段级错误详情
 */

import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';
import { errorPayload } from '../routes/common';

/** 验证结果附加到 req.validated */
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

/** 格式化 Zod 错误为字段路径 → 消息映射 */
function formatZodError(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/** 验证请求体 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodError(result.error);
      res.status(400).json(errorPayload('validation failed', 'validation_error', 400, { errors }));
      return;
    }
    if (!req.validated) req.validated = {};
    req.validated.body = result.data;
    next();
  };
}

/** 验证查询参数 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodError(result.error);
      res.status(400).json(errorPayload('validation failed', 'validation_error', 400, { errors }));
      return;
    }
    if (!req.validated) req.validated = {};
    req.validated.query = result.data;
    next();
  };
}

// ===== 核心 Schema 定义 =====

/** 地理坐标点 */
const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  ts: z.number().optional(),
});

/** 创建模板路线 */
export const createTemplateRouteSchema = z.object({
  shapeType: z.string().min(1).max(50),
  templateId: z.string().optional().nullable(),
  templateCode: z.string().optional().nullable(),
  provider: z.string().optional(),
  locale: z.string().optional(),
  targetKm: z.number().min(1).max(50).optional(),
  startPoint: geoPointSchema,
  currentAccuracy: z.number().optional().nullable(),
});

/** 调整路线距离 */
export const adjustRouteSchema = z.object({
  targetKm: z.number().min(1).max(50),
});

/** 重映射路线 */
export const rebaseRouteSchema = z.object({
  startPoint: geoPointSchema.nullable().optional(),
  endPoint: geoPointSchema.nullable().optional(),
  strategy: z.string().max(50).optional(),
});

/** 开始跑步会话 */
export const startSessionSchema = z.object({
  provider: z.string().optional(),
  riskConfirmed: z.boolean().optional(),
});

/** 上报位置 */
export const reportLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nullable().optional(),
  ts: z.number().optional(),
});

/** 结束会话 */
export const finishSessionSchema = z.object({
  actualPath: z.array(geoPointSchema).optional().default([]),
});

/** 快捷登录 */
export const quickLoginSchema = z.object({
  provider: z.enum(['wechat', 'alipay']),
  deviceId: z.string().min(1).max(128),
  authCode: z.string().optional(),
  displayName: z.string().max(100).optional().nullable(),
});

/** 发送短信验证码 */
export const smsCodeSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, '手机号必须为 11 位数字'),
});

/** 手机号登录 */
export const phoneLoginSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, '手机号必须为 11 位数字'),
  smsCode: z.string().min(4).max(6),
  deviceId: z.string().max(128).optional(),
});

// ===== 社区 API Schema =====

/** 发布社区帖子 */
export const createPostSchema = z.object({
  content: z.string().min(1, '帖子内容不能为空').max(2000, '帖子内容不能超过 2000 字'),
  routeId: z.string().optional().nullable(),
  images: z.array(z.string().max(500)).max(9, '最多 9 张图片').optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/** 发布评论 */
export const addCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(500, '评论内容不能超过 500 字'),
  parentCommentId: z.string().optional().nullable(),
});

/** 举报帖子 */
export const reportPostSchema = z.object({
  reason: z.string().min(1, '举报理由不能为空').max(500),
  category: z.enum(['spam', 'abuse', 'porn', 'ad', 'other']).optional(),
});

/** 批量标记通知已读 */
export const batchReadNotificationsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, '至少需要一个通知 ID').max(100, '最多 100 条'),
});

// ===== 发现页 API Schema =====

/** 收藏/取消收藏 */
export const setFavoriteSchema = z.object({
  targetType: z.enum(['template', 'route', 'post'], { message: '不支持的收藏类型' }),
  targetId: z.string().min(1, 'targetId 不能为空'),
});

/** 搜索查询参数 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(100),
  scope: z.enum(['all', 'templates', 'routes', 'posts', 'users']).optional().default('all'),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

/** 导出所有 schema 供路由使用 */
export const schemas = {
  createTemplateRoute: createTemplateRouteSchema,
  adjustRoute: adjustRouteSchema,
  rebaseRoute: rebaseRouteSchema,
  startSession: startSessionSchema,
  reportLocation: reportLocationSchema,
  finishSession: finishSessionSchema,
  quickLogin: quickLoginSchema,
  smsCode: smsCodeSchema,
  phoneLogin: phoneLoginSchema,
  createPost: createPostSchema,
  addComment: addCommentSchema,
  reportPost: reportPostSchema,
  batchReadNotifications: batchReadNotificationsSchema,
  setFavorite: setFavoriteSchema,
  searchQuery: searchQuerySchema,
};
