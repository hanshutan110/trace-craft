/**
 * Web 离线壳注册：仅缓存应用静态资源和 index.html。
 * 路线/历史等业务数据仍由 IndexedDB offlineStore 管理，避免把接口响应混进 HTTP 缓存。
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[sw] registration failed', error);
    });
  });
}
