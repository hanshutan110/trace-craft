/**
 * 实时通信服务（Socket.IO）
 *
 * 提供 WebSocket 实时连接和事件分发
 * 支持事件：通知、位置同步、会话状态变更
 */
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '../api/client';
import type { NotificationItem } from '../api/community';

/** 位置同步事件载荷 */
export interface LocationSyncEvent {
  sessionId: string;
  routeId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  ts: number;
  cursor: number;
}

/** 实时事件映射表（事件名 → 载荷类型） */
type RealtimeEventMap = {
  notification: NotificationItem;
  'location:update': LocationSyncEvent;
  'session:started': Record<string, unknown>;
  'session:paused': Record<string, unknown>;
  'session:resumed': Record<string, unknown>;
  'session:finished': Record<string, unknown>;
};

/** 事件处理器类型 */
type Handler<K extends keyof RealtimeEventMap> = (payload: RealtimeEventMap[K]) => void;

/** Socket.IO 实例 */
let socket: Socket | null = null;
/** 事件监听器注册表 */
const listeners = new Map<keyof RealtimeEventMap, Set<Handler<any>>>();

/** 从 API_BASE 提取 Socket 连接基址 */
function socketBaseUrl(): string {
  const url = new URL(API_BASE);
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

/** 本地事件分发（向所有已注册的 handler 广播） */
function emitLocal<K extends keyof RealtimeEventMap>(event: K, payload: RealtimeEventMap[K]): void {
  listeners.get(event)?.forEach((handler) => handler(payload));
}

/** 绑定 Socket.IO 事件到本地分发器 */
function bindSocketEvents(nextSocket: Socket): void {
  (['notification', 'location:update', 'session:started', 'session:paused', 'session:resumed', 'session:finished'] as const)
    .forEach((event) => {
      nextSocket.on(event, (payload: RealtimeEventMap[typeof event]) => emitLocal(event, payload));
    });
}

/** 建立实时连接（自动重连 5 次） */
export function connectRealtime(): void {
  if (socket?.connected || socket?.active) return;
  socket = io(socketBaseUrl(), {
    path: '/ws',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });
  bindSocketEvents(socket);
}

/** 断开实时连接 */
export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * 注册实时事件监听
 * @returns 取消监听的清理函数
 */
export function onRealtime<K extends keyof RealtimeEventMap>(event: K, handler: Handler<K>): () => void {
  const current = listeners.get(event) || new Set<Handler<any>>();
  current.add(handler);
  listeners.set(event, current);
  return () => {
    current.delete(handler);
    if (current.size === 0) listeners.delete(event);
  };
}
