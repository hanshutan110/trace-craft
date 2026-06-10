/**
 * TraceCraft 坐标转换模块
 *
 * 支持三大坐标系互转：
 *   - WGS-84：GPS 原始坐标系（国际标准）
 *   - GCJ-02：高德/腾讯地图使用的国测局坐标（中国强制偏移）
 *   - BD-09：百度地图在 GCJ-02 基础上的二次加密坐标
 *
 * 算法基于公开的坐标转换公式，精度约 1-2 米
 */

import type { GeoPoint } from './geo';

/** 坐标系类型：WGS-84 / GCJ-02 / BD-09 */
export type CrsType = 'wgs84' | 'gcj02' | 'bd09';

const PI = Math.PI;
// 克拉索夫斯基椭球参数（国测局坐标转换使用）
const A = 6378245.0;
const EE = 0.00669342162296594323;

/** 判断坐标是否在中国境外，境外不做偏移 */
function outOfChina(lat: number, lon: number): boolean {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

/** GCJ-02 转换辅助函数：纬度偏移量计算 */
function transformLat(x: number, y: number): number {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret +=
    ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) /
    3.0;
  return ret;
}

/** GCJ-02 转换辅助函数：经度偏移量计算 */
function transformLon(x: number, y: number): number {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret +=
    ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) /
    3.0;
  return ret;
}

/** WGS-84 → GCJ-02（GPS 坐标转高德坐标） */
export function wgs84ToGcj02(lng: number, lat: number): GeoPoint {
  if (outOfChina(lat, lng)) return { lng, lat };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLon(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return {
    lng: lng + dLng,
    lat: lat + dLat,
  };
}

/** GCJ-02 → WGS-84（高德坐标转 GPS 坐标，粗略逆变换） */
export function gcj02ToWgs84(lng: number, lat: number): GeoPoint {
  if (outOfChina(lat, lng)) return { lng, lat };
  const gcj = wgs84ToGcj02(lng, lat);
  return {
    lng: lng * 2 - gcj.lng,
    lat: lat * 2 - gcj.lat,
  };
}

/** BD-09 → GCJ-02（百度坐标转高德坐标） */
export function bd09ToGcj02(lng: number, lat: number): GeoPoint {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z =
    Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * PI * 3000.0) / 180.0);
  const theta =
    Math.atan2(y, x) - 0.000003 * Math.cos((x * PI * 3000.0) / 180.0);
  return {
    lng: z * Math.cos(theta),
    lat: z * Math.sin(theta),
  };
}

/** GCJ-02 → BD-09（高德坐标转百度坐标） */
export function gcj02ToBd09(lng: number, lat: number): GeoPoint {
  const z =
    Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin((lat * PI * 3000.0) / 180.0);
  const theta =
    Math.atan2(lat, lng) + 0.000003 * Math.cos((lng * PI * 3000.0) / 180.0);
  return {
    lng: z * Math.cos(theta) + 0.0065,
    lat: z * Math.sin(theta) + 0.006,
  };
}

/** WGS-84 → BD-09（GPS 坐标直接转百度坐标） */
export function wgs84ToBd09(lng: number, lat: number): GeoPoint {
  const gcj = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcj.lng, gcj.lat);
}

/** BD-09 → WGS-84（百度坐标直接转 GPS 坐标） */
export function bd09ToWgs84(lng: number, lat: number): GeoPoint {
  const gcj = bd09ToGcj02(lng, lat);
  return gcj02ToWgs84(gcj.lng, gcj.lat);
}

/** 坐标转换函数签名 */
type ConvertFn = (lng: number, lat: number) => GeoPoint;

/** 坐标系转换映射表：source → target → 转换函数 */
const CRS_CONVERT_MAP: Record<CrsType, Record<CrsType, ConvertFn>> = {
  wgs84: {
    gcj02: wgs84ToGcj02,
    bd09: wgs84ToBd09,
    wgs84: (lng, lat) => ({ lng, lat }),
  },
  gcj02: {
    wgs84: gcj02ToWgs84,
    bd09: (lng, lat) => gcj02ToBd09(lng, lat),
    gcj02: (lng, lat) => ({ lng, lat }),
  },
  bd09: {
    wgs84: bd09ToWgs84,
    gcj02: bd09ToGcj02,
    bd09: (lng, lat) => ({ lng, lat }),
  },
};

/**
 * 通用坐标转换入口
 * @param point - 坐标点 { lat, lng }
 * @param source - 源坐标系：'wgs84' | 'gcj02' | 'bd09'
 * @param target - 目标坐标系：'wgs84' | 'gcj02' | 'bd09'
 * @returns 转换后的坐标点，输入不合法时返回 null
 */
export function convertPoint(
  point: GeoPoint,
  source: CrsType,
  target: CrsType
): GeoPoint | null {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return null;
  }
  if (source === target) return { lat: point.lat, lng: point.lng };
  const converter = CRS_CONVERT_MAP[source]?.[target];
  if (!converter) return null;
  const converted = converter(point.lng, point.lat);
  return { lat: converted.lat, lng: converted.lng };
}
