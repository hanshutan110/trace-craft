/**
 * 发现模块 - 共享工具函数
 *
 * 从原 DiscoveryScreens.tsx 中提取的公共逻辑，
 * 供 FavoritesScreen / TemplateDetailScreen / SearchScreen / SearchResultScreen 共同使用。
 *
 * @source 拆分自 components/DiscoveryScreens.tsx
 */

/** localStorage key: 当前搜索关键词 */
export const SEARCH_QUERY_KEY = 'tracecraft_search_query';

/** 根据形状类型返回对应的 Tailwind 颜色类 */
export function shapeColor(shapeType: string): string {
  const colors: Record<string, string> = {
    heart: 'text-rose-500',
    star: 'text-yellow-500',
    circle: 'text-blue-500',
    triangle: 'text-emerald-500',
    square: 'text-cyan-500',
    hexagon: 'text-violet-500',
  };
  return colors[shapeType] || 'text-slate-500';
}

/** 根据形状类型生成对应的 SVG 图标 */
export function shapeIcon(shapeType: string, className: string = 'w-14 h-14') {
  const colorClass = `${className} ${shapeColor(shapeType)}`;
  if (shapeType === 'star') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" /></svg>;
  }
  if (shapeType === 'circle') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="50" cy="50" r="30" /></svg>;
  }
  if (shapeType === 'triangle') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 85,80 L 15,80 Z" /></svg>;
  }
  if (shapeType === 'square') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><rect x="22" y="22" width="56" height="56" /></svg>;
  }
  if (shapeType === 'hexagon') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 80,32 L 80,68 L 50,85 L 20,68 L 20,32 Z" /></svg>;
  }
  return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" /></svg>;
}
