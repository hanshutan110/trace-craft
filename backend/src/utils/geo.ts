/**
 * TraceCraft 地理计算工具模块
 *
 * 提供：
 *   - 球面距离计算（Haversine 公式）
 *   - 路线重采样（按距离/按点数）
 *   - 角度平滑（去除急转弯点）
 *   - 路线缩放（保持形状等比缩放）
 *   - 质心计算
 *
 * 所有坐标点统一使用 GeoPoint 接口，保证经纬度类型安全
 */

/** 地理坐标点，经纬度均为 number 类型 */
export interface GeoPoint {
  lat: number;
  lng: number;
  ts?: number;
}

/** 缩放选项，控制输出点数范围 */
export interface ScaleOptions {
  minPoints?: number;
  maxPoints?: number;
}

/** 角度转弧度 */
function toRad(v: number): number {
  return (v * Math.PI) / 180;
}

/**
 * Haversine 公式计算两点间球面距离（米）
 * 地球半径取 6371000m
 */
export function pointDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

/** 计算路径累计距离数组及总距离 */
function cumulativeLen(points: GeoPoint[]): { lens: number[]; total: number } {
  const lens: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += pointDistanceMeters(points[i - 1], points[i]);
    lens.push(total);
  }
  return { lens, total };
}

/**
 * 按指定间距（米）重采样路线点集
 * 在相邻原始点之间线性插值，确保相邻点间距均匀
 */
export function resampleByDistance(points: GeoPoint[], spacingMeters: number = 8): GeoPoint[] {
  if (!Array.isArray(points) || points.length < 2 || spacingMeters <= 0) {
    return points || [];
  }
  const result: GeoPoint[] = [points[0]];
  const { lens, total } = cumulativeLen(points);
  for (let d = spacingMeters; d < total; d += spacingMeters) {
    let i = 1;
    while (i < lens.length && lens[i] < d) {
      i += 1;
    }
    if (i >= points.length) {
      break;
    }
    const d0 = lens[i - 1];
    const d1 = lens[i];
    const ratio = d1 === d0 ? 0 : (d - d0) / (d1 - d0);
    const from = points[i - 1];
    const to = points[i];
    result.push({
      lat: from.lat + (to.lat - from.lat) * ratio,
      lng: from.lng + (to.lng - from.lng) * ratio,
      ts: Date.now() + result.length * 1000,
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * 按目标点数降采样路线点集
 * 均匀间隔取点，用于控制输出点数范围
 */
export function resampleByCount(points: GeoPoint[], targetCount: number = 120): GeoPoint[] {
  if (!Array.isArray(points) || points.length <= targetCount) {
    return points;
  }
  const step = Math.floor(points.length / targetCount);
  const out: GeoPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    out.push(points[i]);
    if (out.length >= targetCount) {
      break;
    }
  }
  return out;
}

/**
 * 角度平滑：去除转角过大的急弯点
 * 当相邻两段转角差 > 110° 时判定为急弯，移除中间点
 * 保留首尾点
 */
export function angleSmooth(points: GeoPoint[]): GeoPoint[] {
  if (!Array.isArray(points) || points.length < 3) {
    return points || [];
  }
  const out: GeoPoint[] = [points[0]];
  const toDeg = (v: number): number => (v * 180) / Math.PI;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const angle1 = toDeg(Math.atan2(cur.lat - prev.lat, cur.lng - prev.lng));
    const angle2 = toDeg(Math.atan2(next.lat - cur.lat, next.lng - cur.lng));
    const diff = Math.abs(((angle2 - angle1 + 540) % 360) - 180);
    if (diff <= 110) {
      out.push(cur);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * 等比缩放路线以匹配目标距离
 * 以路线质心为中心缩放，保持整体形状不变
 * 缩放后平滑 + 重采样控制点数范围
 */
export function scalePathPreserveShape(
  points: GeoPoint[],
  targetMeters: number,
  opts: ScaleOptions = {}
): GeoPoint[] {
  if (!Array.isArray(points) || points.length < 2 || targetMeters <= 0) {
    return points || [];
  }
  const minPts = Number.isFinite(opts.minPoints) ? opts.minPoints! : 3;
  const maxPts = Number.isFinite(opts.maxPoints) ? opts.maxPoints! : points.length;
  let cur = 0;
  for (let i = 1; i < points.length; i += 1) {
    cur += pointDistanceMeters(points[i - 1], points[i]);
  }
  if (cur <= 0) {
    return points;
  }
  const ratio = targetMeters / cur;
  const center = latLngCentroid(points);
  const scaled: GeoPoint[] = points.map((p, index) => {
    const nx = center.lat + (p.lat - center.lat) * ratio;
    const ny = center.lng + (p.lng - center.lng) * ratio;
    return {
      lat: nx,
      lng: ny,
      ts: p.ts || Date.now() + index * 1000,
    };
  });
  const smoothed = angleSmooth(scaled);
  return resampleByCount(smoothed, Math.min(Math.max(minPts, smoothed.length), maxPts));
}

/** 计算点集的经纬度质心（简单算术平均） */
export function latLngCentroid(points: GeoPoint[]): GeoPoint {
  const sum = points.reduce(
    (acc, p) => {
      acc.lat += p.lat;
      acc.lng += p.lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}
