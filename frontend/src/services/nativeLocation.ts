/**
 * 原生定位服务
 *
 * 提供统一的定位接口，优先级：Capacitor 原生 > 浏览器 Geolocation > 固定默认点
 * 默认回退坐标为北京天安门（39.9087, 116.3975）
 */
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { GeoPoint } from '../types';

/** 默认回退坐标点（北京） */
const DEFAULT_FALLBACK_POINT: GeoPoint = { lat: 39.9087, lng: 116.3975 };

/** 定位结果 */
export interface CurrentLocationResult {
  point: GeoPoint;
  accuracy: number | null;
  isFallback?: boolean;
  source: 'capacitor' | 'browser' | 'fallback';
}

/** 浏览器 Geolocation 定位（失败时返回默认坐标） */
function browserLocation(): Promise<CurrentLocationResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ point: DEFAULT_FALLBACK_POINT, accuracy: null, isFallback: true, source: 'fallback' });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          source: 'browser',
        });
      },
      () => resolve({ point: DEFAULT_FALLBACK_POINT, accuracy: null, isFallback: true, source: 'fallback' }),
      {
        enableHighAccuracy: true,
        timeout: 3500,
        maximumAge: 30000,
      },
    );
  });
}

/**
 * 当前定位入口：原生 Capacitor 优先，失败时降级浏览器定位，再降级固定点。
 * 后续后台定位/传感器融合只需扩展本服务，路线 API 不直接依赖插件细节。
 */
export async function getCurrentLocation(): Promise<CurrentLocationResult> {
  if (!Capacitor.isNativePlatform()) {
    return browserLocation();
  }
  try {
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] });
    if (permission.location !== 'granted') {
      return browserLocation();
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000,
    });
    return {
      point: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      source: 'capacitor',
    };
  } catch (error) {
    console.warn('[geo] native location failed, fallback to browser', error);
    return browserLocation();
  }
}
