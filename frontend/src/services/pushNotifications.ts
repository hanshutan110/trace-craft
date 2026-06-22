/**
 * 推送通知服务
 *
 * 原生环境：通过 Capacitor PushNotifications 插件注册推送 Token
 * Web 环境：通过 WebSocket 实时连接接收通知，降级为浏览器 Notification API
 */
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getOrCreateDeviceId } from '../api/auth';
import { registerPushToken } from '../api/user';
import { onRealtime } from './realtime';

/** 是否已初始化 */
let initialized = false;
/** Web 环境下的实时通知监听取消函数 */
let realtimeFallback: (() => void) | null = null;
/** 原生插件监听器句柄 */
let nativeHandles: PluginListenerHandle[] = [];

/** 注册原生推送通知（Capacitor 插件） */
async function registerNativePush(): Promise<void> {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  const registrationHandle = await PushNotifications.addListener('registration', (token) => {
    void registerPushToken({
      token: token.value,
      platform: Capacitor.getPlatform(),
      deviceId: getOrCreateDeviceId(),
      provider: 'capacitor',
    });
  });
  const errorHandle = await PushNotifications.addListener('registrationError', () => {
    // 原生通道注册失败时保留 WebSocket 实时通知，不阻断应用。
  });
  nativeHandles = [registrationHandle, errorHandle];
  await PushNotifications.register();
}

/** 登录后初始化通知能力：原生用 Push token，Web 继续使用实时 WebSocket。 */
export async function initPushNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!Capacitor.isNativePlatform()) {
    // Web 环境：先请求通知权限，再注册实时监听
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // 用户拒绝或浏览器不支持时静默降级
      }
    }
    realtimeFallback = onRealtime('notification', (notification) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.body || '' });
      }
    });
    return;
  }

  await registerNativePush();
}

/** 重置推送通知（登出时调用，清除所有监听） */
export function resetPushNotifications(): void {
  realtimeFallback?.();
  realtimeFallback = null;
  nativeHandles.forEach((handle) => {
    void handle.remove();
  });
  nativeHandles = [];
  initialized = false;
}
