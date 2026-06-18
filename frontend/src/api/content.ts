import { apiGet } from './client';

export interface PublicContentItem {
  key: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  updatedAt: string;
}

export async function getPublicContent(type: string, key: string): Promise<PublicContentItem> {
  const data = await apiGet<{ content?: PublicContentItem }>(`/contents/${encodeURIComponent(type)}/${encodeURIComponent(key)}`);
  if (!data.content) throw new Error('content_missing');
  return data.content;
}
