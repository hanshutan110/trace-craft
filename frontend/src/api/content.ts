/**
 * 公开内容 API
 * 获取公告/FAQ/帮助/政策等内容
 */
import { apiGet } from './client';

/** 公开内容条目 */
export interface PublicContentItem {
  key: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  updatedAt: string;
}

/** 获取指定类型和 key 的公开内容 */
export async function getPublicContent(type: string, key: string): Promise<PublicContentItem> {
  const data = await apiGet<{ content?: PublicContentItem }>(`/contents/${encodeURIComponent(type)}/${encodeURIComponent(key)}`);
  if (!data.content) throw new Error('content_missing');
  return data.content;
}
