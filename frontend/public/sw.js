/**
 * TraceCraft PWA Service Worker
 *
 * 功能：
 *   - App Shell 缓存（index.html + 基础资源）
 *   - 静态资源缓存（/assets/ 下的 JS/CSS/图片）
 *   - API GET 请求缓存（路线数据，支持离线查看）
 *   - 缓存版本管理（更新时自动清理旧缓存）
 */

const CACHE_VERSION = 'tracecraft-app-v2';
const CACHE_ASSETS = 'tracecraft-assets-v2';
const CACHE_API = 'tracecraft-api-v2';

const APP_SHELL = ['/', '/index.html'];

// 需要缓存的 API 路径前缀（仅 GET 请求）
const CACHEABLE_API_PREFIXES = ['/api/runs', '/api/routes/', '/api/templates'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => ![CACHE_VERSION, CACHE_ASSETS, CACHE_API].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. 导航请求：网络优先，失败回退缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // 2. 静态资源：缓存优先，后台更新
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const refresh = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_ASSETS).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || refresh;
      }),
    );
    return;
  }

  // 3. API GET 请求：网络优先，失败回退缓存（支持离线查看路线数据）
  if (CACHEABLE_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_API).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    );
    return;
  }
});
