/**
 * 社区模块 - 共享工具函数
 *
 * 从原 CommunityScreens.tsx 中提取的公共逻辑，
 * 供 TraceShareScreen / SquareScreen / PostDetailScreen / NotificationsScreen 共同使用。
 *
 * @source 拆分自 components/CommunityScreens.tsx
 */
import type { CommunityPostItem } from '../../api/community';

/** 根据社区帖子类型生成对应 SVG 图形 */
export function communityShapeSvg(shapeType: string, className: string = 'w-16 h-16 text-rose-500') {
  if (shapeType === 'star') {
    return <svg className={className.replace('text-rose-500', 'text-yellow-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5"><path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" /></svg>;
  }
  if (shapeType === 'circle') {
    return <svg className={className.replace('text-rose-500', 'text-blue-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5"><circle cx="50" cy="50" r="28" /></svg>;
  }
  if (shapeType === 'hexagon') {
    return <svg className={className.replace('text-rose-500', 'text-violet-500')} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5"><path d="M 50,15 L 80,32 L 80,68 L 50,85 L 20,68 L 20,32 Z" /></svg>;
  }
  return <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5"><path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" /></svg>;
}

/** 格式化相对时间（刚刚 / x分钟前 / x小时前 / x天前） */
export function formatRelativeTime(value: string, text: (cn: string, en: string) => string): string {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return text('刚刚', 'Just now');
  if (minutes < 60) return text(`${minutes}分钟前`, `${minutes}m ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return text(`${hours}小时前`, `${hours}h ago`);
  const days = Math.floor(hours / 24);
  return text(`${days}天前`, `${days}d ago`);
}

/** 获取帖子的首张图片 URL */
export function primaryCommunityImage(post: CommunityPostItem): string {
  const images = post.mediaPayload?.images;
  if (!Array.isArray(images)) return '';
  const first = images[0] as { url?: unknown } | undefined;
  return typeof first?.url === 'string' ? first.url : '';
}
