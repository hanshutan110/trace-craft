/**
 * TraceCraft Socket.IO WebSocket 服务
 *
 * 职责：
 *   - 基于 token 认证建立 WebSocket 连接
 *   - 按用户 ID 分配房间，支持定向推送
 *   - 实时通知推送（评论、点赞、关注）
 *   - 跑步会话位置实时同步
 */

import { Server as SocketIOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyUserToken } from './token';
import { isUserTokenRevoked } from './tokenRevocationService';
import { logger } from './logger';

// ===== 类型定义 =====

/** 通知推送事件 */
export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  targetType?: string | null;
  targetId?: string | null;
  actorUserId?: string | null;
  createdAt: string;
}

/** 位置同步事件 */
export interface LocationSyncEvent {
  sessionId: string;
  routeId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  ts: number;
  cursor: number;
}

// ===== 全局实例 =====

let io: SocketIOServer | null = null;

/** Socket → userId 映射 */
const socketUserMap = new Map<string, string>();

/**
 * 初始化 Socket.IO 服务
 *
 * 认证策略：
 *   - 从 handshake.auth.token 或 handshake.headers.authorization 读取 token
 *   - 验证通过后加入 user:{userId} 房间
 *   - 验证失败拒绝连接
 */
export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = (process.env.TRACECRAFT_CORS_ORIGINS || 'http://localhost:3016,http://localhost:3018')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: '/ws',
    transports: ['websocket', 'polling'],
  });

  // 认证中间件
  io.use(async (socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      extractBearer(socket.handshake.headers.authorization) ||
      readCookie(socket.handshake.headers.cookie, 'tc_user_token');

    if (!token) {
      return next(new Error('auth_token_required'));
    }
    const payload = verifyUserToken(token);
    if (!payload?.userId) {
      return next(new Error('invalid_token'));
    }
    if (await isUserTokenRevoked(token)) {
      return next(new Error('invalid_token'));
    }
    (socket.data as Record<string, string>).userId = payload.userId;
    next();
  });

  // 连接处理
  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as Record<string, string>).userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // 加入用户专属房间
    socket.join(`user:${userId}`);
    socketUserMap.set(socket.id, userId);

    logger.info('ws_connected', { userId, socketId: socket.id });

    // 客户端心跳 ping
    socket.on('ping:client', (callback) => {
      if (typeof callback === 'function') {
        callback({ ts: Date.now() });
      }
    });

    // 位置分享房间：加入/离开
    socket.on('share:join', (sessionId: string) => {
      if (typeof sessionId === 'string' && sessionId.trim()) {
        socket.join(`share:${sessionId.trim()}`);
        logger.info('share_room_joined', { userId, socketId: socket.id, sessionId });
      }
    });

    socket.on('share:leave', (sessionId: string) => {
      if (typeof sessionId === 'string' && sessionId.trim()) {
        socket.leave(`share:${sessionId.trim()}`);
        logger.info('share_room_left', { userId, socketId: socket.id, sessionId });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      socketUserMap.delete(socket.id);
      logger.info('ws_disconnected', { userId, socketId: socket.id });
    });
  });

  logger.info('ws_initialized', { path: '/ws' });
  return io;
}

/** 从 Authorization 头提取 Bearer token */
function extractBearer(auth: string | undefined): string | null {
  if (typeof auth !== 'string') return null;
  return auth.replace(/^Bearer\s+/i, '').trim() || null;
}

/** Socket.IO 浏览器客户端依赖 HttpOnly Cookie，JS 无法读取 token，只能由握手头透传。 */
function readCookie(rawCookie: string | undefined, name: string): string | null {
  if (typeof rawCookie !== 'string' || !rawCookie) return null;
  const prefix = `${name}=`;
  const item = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

// ===== 推送函数 =====

/**
 * 向指定用户推送通知
 *
 * 在 communityService 中评论/点赞/关注操作后调用
 */
export function pushNotification(userId: string, notification: NotificationEvent): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * 广播跑步位置更新给关注者
 *
 * 推送到两个目标：
 *   1. 用户专属房间（user:{userId}）
 *   2. 位置分享房间（share:{sessionId}），供关注者实时观看
 */
export function broadcastLocationUpdate(userId: string, event: LocationSyncEvent): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('location:update', event);
  io.to(`share:${event.sessionId}`).emit('location:update', event);
}

/**
 * 推送跑步会话状态变更（开始/暂停/恢复/结束）
 *
 * 同时推送到用户房间和分享房间
 */
export function broadcastSessionEvent(userId: string, eventType: string, data: Record<string, unknown>): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(`session:${eventType}`, data);
  if (data.sessionId) {
    io.to(`share:${data.sessionId}`).emit(`session:${eventType}`, data);
  }
}

/**
 * 加入位置分享房间
 *
 * 关注者通过此函数加入跑步者的分享房间，实时接收位置更新
 */
export function joinShareRoom(socketId: string, sessionId: string): void {
  if (!io) return;
  const socket = io.sockets.sockets.get(socketId);
  if (socket) {
    socket.join(`share:${sessionId}`);
    logger.info('share_room_joined', { socketId, sessionId });
  }
}

/**
 * 离开位置分享房间
 */
export function leaveShareRoom(socketId: string, sessionId: string): void {
  if (!io) return;
  const socket = io.sockets.sockets.get(socketId);
  if (socket) {
    socket.leave(`share:${sessionId}`);
    logger.info('share_room_left', { socketId, sessionId });
  }
}

// ===== 状态查询 =====

/** 获取当前 WebSocket 在线连接数 */
export function getOnlineSocketCount(): number {
  return io ? socketUserMap.size : 0;
}

/** 获取当前在线的用户 ID 列表（去重） */
export function getOnlineUserIds(): string[] {
  return [...new Set(socketUserMap.values())];
}

/** 获取 Socket.IO 实例（供高级用法使用） */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

// ===== 生命周期 =====

/** 关闭 Socket.IO 服务 */
export async function closeWebSocket(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => resolve());
    });
    io = null;
    socketUserMap.clear();
  }
}
