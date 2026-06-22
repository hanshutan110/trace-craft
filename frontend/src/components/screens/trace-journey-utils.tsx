/**
 * 轨迹旅程模块 - 共享工具函数与类型
 *
 * 从原 TraceJourneyScreens.tsx 中提取的公共逻辑，
 * 供 SplashScreen / MyTracesScreen / TraceDetailScreen / RunHistoryScreen / RunDetailScreen 共同使用。
 *
 * @source 拆分自 components/TraceJourneyScreens.tsx
 */
import type { GeneratedRoute } from '../../types';
import type { RunHistoryEntry } from '../../api/user';

/** localStorage key: 当前选中的路线 ID */
export const SELECTED_ROUTE_ID_KEY = 'tracecraft_selected_route_id';

/** localStorage key: 当前选中的跑步会话 ID */
export const SELECTED_RUN_SESSION_ID_KEY = 'tracecraft_selected_run_session_id';

/** 轨迹列表项数据结构 */
export interface TraceListItem {
  id: string;
  title: string;
  titleEn: string;
  distance: string;
  date: string;
  status: 'completed' | 'unrun';
  isFavorite: boolean;
  route: GeneratedRoute;
}

/** 格式化日期字符串，取前10位 (YYYY-MM-DD) */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  return value.slice(0, 10);
}

/** 格式化距离（米 → 公里），>=10km 保留1位小数 */
export function formatKm(valueM: number | null | undefined): string {
  const km = Number(valueM || 0) / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)}km`;
}

/** 格式化时长（秒 → mm:ss） */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** 获取路线标题（中英文） */
export function routeTitle(route: GeneratedRoute | null | undefined): { title: string; titleEn: string } {
  if (!route) return { title: '未命名轨迹', titleEn: 'Untitled Route' };
  if (route.shapeType) {
    const labels: Record<string, [string, string]> = {
      circle: ['圆形路线', 'Circle Route'],
      triangle: ['三角路线', 'Triangle Route'],
      square: ['方形路线', 'Square Route'],
      star: ['星形路线', 'Star Route'],
      heart: ['爱心路线', 'Heart Route'],
      hexagon: ['六边形路线', 'Hexagon Route'],
      custom: ['图片路线', 'Image Route'],
    };
    const [title, titleEn] = labels[route.shapeType] || ['创意路线', 'Creative Route'];
    return { title, titleEn };
  }
  const filename = route.source?.filename;
  return {
    title: filename ? `${filename} 路线` : '图片路线',
    titleEn: filename ? `${filename} Route` : 'Image Route',
  };
}

/** 获取路线 SVG 图标 */
export function routeIcon(route: GeneratedRoute | null | undefined, className: string = 'w-10 h-10 text-cyan-500') {
  const shape = route?.shapeType || 'custom';
  if (shape === 'heart') {
    return <svg className={className.replace('text-cyan-500', 'text-rose-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (shape === 'star') {
    return <svg className={className.replace('text-cyan-500', 'text-yellow-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (shape === 'circle') {
    return <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="50" cy="50" r="32" /></svg>;
  }
  return <svg className={className.replace('text-cyan-500', 'text-orange-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/** 将 GeneratedRoute 转换为列表项 */
export function toTraceListItem(route: GeneratedRoute): TraceListItem {
  const title = routeTitle(route);
  return {
    id: route.id,
    ...title,
    distance: formatKm(route.actualDistanceM || route.meta?.distanceM),
    date: formatDate(route.updatedAt || route.createdAt),
    status: route.status === 'finished' || route.status === 'completed' ? 'completed' : 'unrun',
    isFavorite: Boolean(route.isFavorite),
    route,
  };
}

/** 将 RunHistoryEntry 转换为历史记录展示数据 */
export function toHistoryRecord(entry: RunHistoryEntry) {
  const title = routeTitle(entry.route);
  const durationSec = Number(entry.metrics?.timeSec || 0);
  const distanceM = Number(entry.metrics?.actualDistanceM || entry.metrics?.plannedDistanceM || entry.route?.actualDistanceM || 0);
  const paceSec = distanceM > 0 ? durationSec / (distanceM / 1000) : 0;
  const pace = paceSec > 0 ? `${Math.floor(paceSec / 60)}:${String(Math.round(paceSec % 60)).padStart(2, '0')}/km` : '--/km';
  return {
    id: entry.sessionId,
    ...title,
    date: formatDate(entry.finishedAt || entry.startedAt || entry.createdAt),
    dist: formatKm(distanceM),
    duration: formatDuration(durationSec),
    pace,
    accuracy: Math.round(Number(entry.metrics?.completionRate || entry.route?.shapeSimilarityScore || 0)),
    svg: routeIcon(entry.route),
    entry,
  };
}
