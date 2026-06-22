/**
 * 离线存储服务（基于 IndexedDB）
 *
 * 缓存路线/历史等业务数据，支持离线访问
 * 不缓存敏感 token，仅存储可序列化的 JSON 数据
 *
 * 新增能力：
 *   - deleteOfflineValue：删除指定缓存条目
 *   - clearOfflineStore：清空所有缓存
 *   - isOnline / useOnline：网络状态检测 Hook
 */

import { useEffect, useState } from 'react';

/** 离线存储条目包装（含时间戳） */
interface OfflineEntry<T> {
  id: string;
  value: T;
  updatedAt: number;
}

/** IndexedDB 配置常量 */
const DB_NAME = 'tracecraft-offline';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let dbPromise: Promise<IDBDatabase> | null = null;

/** 打开/初始化 IndexedDB（单例模式） */
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** 事务包装器：统一处理事务创建和请求回调 */
async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** IndexedDB 小封装：只存可离线查看的路线/历史 JSON，不缓存敏感 token。 */
/** 缓存值到 IndexedDB（失败静默忽略） */
export async function putOfflineValue<T>(key: string, value: T): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const entry: OfflineEntry<T> = { id: key, value, updatedAt: Date.now() };
    await withStore('readwrite', (store) => store.put(entry));
  } catch (error) {
    console.warn('[offline] failed to cache value', key, error);
  }
}

/** 从 IndexedDB 读取缓存值，不存在返回 null */
export async function getOfflineValue<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  try {
    const entry = await withStore<OfflineEntry<T> | undefined>('readonly', (store) => store.get(key));
    return entry?.value ?? null;
  } catch (error) {
    console.warn('[offline] failed to read cached value', key, error);
    return null;
  }
}

/** 删除指定缓存条目 */
export async function deleteOfflineValue(key: string): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    await withStore('readwrite', (store) => store.delete(key));
  } catch (error) {
    console.warn('[offline] failed to delete cached value', key, error);
  }
}

/** 清空所有离线缓存 */
export async function clearOfflineStore(): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    await withStore('readwrite', (store) => store.clear());
  } catch (error) {
    console.warn('[offline] failed to clear store', error);
  }
}

// ===== 网络状态检测 =====

/** 当前是否在线（SSR 安全） */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

/** React Hook：监听在线/离线状态变化 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => isOnline());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
