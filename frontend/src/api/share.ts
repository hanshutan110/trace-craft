/**
 * 分享功能 API
 *
 * 提供分享卡片生成、资产 URL 转换等功能
 */
import { API_BASE, apiPost } from './client';
import type { UserAsset } from './user';

/** 分享记录 */
export interface ShareRecord {
  id: string;
  channel: string;
  routeId: string | null;
  sessionId: string | null;
  createdAt: string;
}

/** 分享卡片生成结果（资产 + 分享记录） */
export interface ShareCardResult {
  asset: UserAsset;
  shareRecord: ShareRecord;
}

/** 支持的分享渠道 */
export type ShareChannel = 'wechat' | 'moments' | 'xiaohongshu' | 'douyin' | 'poster' | 'system';

/**
 * 将资产相对 URL 转为绝对 URL
 * 已经是 http/https 开头的直接返回
 */
export function publicAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

/** 生成分享卡片（异步队列优先，Redis 不可用时同步降级） */
export async function createShareCard(params: {
  routeId?: string | null;
  sessionId?: string | null;
  channel?: ShareChannel;
}): Promise<ShareCardResult> {
  const payload = await apiPost<{ asset?: UserAsset; shareRecord?: ShareRecord }>('/share/cards', params);
  if (!payload.asset || !payload.shareRecord) throw new Error('share_card_missing');
  return { asset: payload.asset, shareRecord: payload.shareRecord };
}
