import { API_BASE, apiPost } from './client';
import type { UserAsset } from './user';

export interface ShareRecord {
  id: string;
  channel: string;
  routeId: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface ShareCardResult {
  asset: UserAsset;
  shareRecord: ShareRecord;
}

export type ShareChannel = 'wechat' | 'moments' | 'xiaohongshu' | 'douyin' | 'poster' | 'system';

export function publicAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function createShareCard(params: {
  routeId?: string | null;
  sessionId?: string | null;
  channel?: ShareChannel;
}): Promise<ShareCardResult> {
  const payload = await apiPost<{ asset?: UserAsset; shareRecord?: ShareRecord }>('/share/cards', params);
  if (!payload.asset || !payload.shareRecord) throw new Error('share_card_missing');
  return { asset: payload.asset, shareRecord: payload.shareRecord };
}
