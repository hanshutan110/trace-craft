import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { initStorage } from './storage';
import { pgPool } from './postgres-storage';
import { newId } from '../utils/id';
import { safeJsonObject } from '../utils/json';
import { logger } from './logger';

export type UserAssetType = 'avatar' | 'share_poster' | 'route_preview' | 'qr_card' | 'community_media';

export interface UserAsset {
  id: string;
  userId: string;
  assetType: UserAssetType;
  url: string;
  storageProvider: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ALLOWED_TYPES = new Set<UserAssetType>(['avatar', 'share_poster', 'route_preview', 'qr_card', 'community_media']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = Math.max(1, Number(process.env.TRACECRAFT_ASSET_MAX_MB || 5)) * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.env.TRACECRAFT_UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const PUBLIC_PREFIX = (process.env.TRACECRAFT_UPLOAD_PUBLIC_PATH || '/uploads').replace(/\/$/, '');
const CACHE_ASSET_TYPES: UserAssetType[] = ['share_poster', 'route_preview', 'qr_card', 'community_media'];
const ASSET_STORAGE_PROVIDER = (process.env.TRACECRAFT_ASSET_STORAGE_PROVIDER || 'local').toLowerCase();

function requireDb(): void {
  if (!pgPool) throw new Error('postgres_not_configured');
}

function assertAssetType(value: unknown): UserAssetType {
  const normalized = String(value || '');
  if (!ALLOWED_TYPES.has(normalized as UserAssetType)) {
    throw new Error('invalid_asset_type');
  }
  return normalized as UserAssetType;
}

function mapAsset(row: Record<string, unknown>): UserAsset {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    assetType: String(row.asset_type) as UserAssetType,
    url: String(row.url),
    storageProvider: String(row.storage_provider || 'local'),
    metadata: safeJsonObject(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at as string | Date).toISOString() : '',
  };
}

function publicUrlToLocalPath(url: string, userId: string): string | null {
  if (!url.startsWith(`${PUBLIC_PREFIX}/`)) return null;
  const relative = url.slice(PUBLIC_PREFIX.length + 1);
  const normalized = relative.split('/').join(path.sep);
  const absolute = path.resolve(UPLOAD_ROOT, normalized);
  const userRoot = path.resolve(UPLOAD_ROOT, 'users', userId);
  if (absolute !== userRoot && !absolute.startsWith(`${userRoot}${path.sep}`)) return null;
  return absolute;
}

function relativeAssetPath(userId: string, assetType: UserAssetType, filename: string): string {
  return path.join('users', userId, assetType, filename).replace(/\\/g, '/');
}

async function saveLocalAsset(relativePath: string, buffer: Buffer): Promise<{ url: string; provider: string }> {
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return { url: `${PUBLIC_PREFIX}/${relativePath}`, provider: 'local' };
}

async function saveWebhookAsset(relativePath: string, buffer: Buffer, mimeType: string): Promise<{ url: string; provider: string }> {
  const url = process.env.TRACECRAFT_ASSET_WEBHOOK_URL || '';
  if (!url) throw new Error('asset_storage_not_configured');
  const body = JSON.stringify({
    key: relativePath,
    contentType: mimeType,
    bodyBase64: buffer.toString('base64'),
  });
  const secret = process.env.TRACECRAFT_ASSET_WEBHOOK_SECRET || '';
  const signature = secret ? crypto.createHmac('sha256', secret).update(body).digest('hex') : '';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'X-TraceCraft-Signature': signature } : {}),
    },
    body,
  });
  if (!response.ok) throw new Error('asset_storage_failed');
  const payload = await response.json() as { url?: unknown; provider?: unknown };
  const publicUrl = typeof payload.url === 'string' && payload.url ? payload.url : `${process.env.TRACECRAFT_ASSET_PUBLIC_BASE_URL || ''}/${relativePath}`;
  if (!publicUrl || publicUrl === `/${relativePath}`) throw new Error('asset_storage_url_missing');
  return { url: publicUrl, provider: typeof payload.provider === 'string' ? payload.provider : 'webhook' };
}

// ===== S3 兼容存储 Provider（AWS S3 / 阿里云 OSS / MinIO） =====

/** AWS Signature V4 签名 */
function awsSigV4(
  method: string,
  host: string,
  path: string,
  queryString: string,
  payload: Buffer,
  headers: Record<string, string>,
  region: string,
  service: string,
  accessKeyId: string,
  secretAccessKey: string,
  timestamp: Date,
): { authorization: string; signedHeaders: string } {
  const dateStamp = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = timestamp.toISOString().replace(/[:-]/g, '').replace(/\..*Z$/, 'Z');
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
  const allHeaders: Record<string, string> = { ...headers, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash, host };
  const signedHeaderKeys = Object.keys(allHeaders).map((k) => k.toLowerCase()).sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${allHeaders[k] || allHeaders[k.toLowerCase()] || ''}\n`).join('');
  const canonicalRequest = `${method.toUpperCase()}\n${path}\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
  const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { authorization, signedHeaders };
}

/** 通过 S3 兼容 API 上传文件 */
async function saveS3Asset(relativePath: string, buffer: Buffer, mimeType: string): Promise<{ url: string; provider: string }> {
  const endpoint = process.env.S3_ENDPOINT || '';
  const bucket = process.env.S3_BUCKET || '';
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL || '';
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('asset_s3_not_configured');
  }
  const urlObj = new URL(endpoint);
  const host = urlObj.host;
  const objectKey = `${bucket}/${relativePath}`;
  const s3Path = `/${objectKey}`;
  const timestamp = new Date();
  const headers: Record<string, string> = {
    'content-type': mimeType,
    'content-length': String(buffer.length),
  };
  const { authorization } = awsSigV4('PUT', host, s3Path, '', buffer, headers, region, 's3', accessKeyId, secretAccessKey, timestamp);
  const response = await fetch(`${endpoint}${s3Path}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'x-amz-date': timestamp.toISOString().replace(/[:-]/g, '').replace(/\..*Z$/, 'Z'),
      'x-amz-content-sha256': crypto.createHash('sha256').update(buffer).digest('hex'),
      'Authorization': authorization,
    },
    body: buffer,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    logger.error('asset_s3_upload_failed', new Error(errText), { status: response.status });
    throw new Error('asset_storage_failed');
  }
  const publicUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/${relativePath}`
    : `${endpoint.replace(/\/$/, '')}/${objectKey}`;
  return { url: publicUrl, provider: 's3' };
}

async function saveAssetObject(relativePath: string, buffer: Buffer, mimeType: string): Promise<{ url: string; provider: string }> {
  if (ASSET_STORAGE_PROVIDER === 's3') {
    return saveS3Asset(relativePath, buffer, mimeType);
  }
  if (ASSET_STORAGE_PROVIDER === 'webhook') {
    return saveWebhookAsset(relativePath, buffer, mimeType);
  }
  return saveLocalAsset(relativePath, buffer);
}

export function uploadRoot(): string {
  return UPLOAD_ROOT;
}

export function assetMaxBytes(): number {
  return MAX_IMAGE_BYTES;
}

export function allowedAssetMimeTypes(): string[] {
  return Object.keys(MIME_TO_EXT);
}

export async function saveUserImageAsset(params: {
  userId: string;
  assetType: unknown;
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}): Promise<UserAsset> {
  await initStorage();
  requireDb();
  const assetType = assertAssetType(params.assetType);
  const ext = MIME_TO_EXT[params.mimeType];
  if (!ext) throw new Error('unsupported_asset_type');
  if (!params.buffer.length || params.buffer.length > MAX_IMAGE_BYTES) throw new Error('invalid_asset_size');

  const id = newId('asset');
  const outputExt = assetType === 'avatar' ? 'webp' : ext;
  const filename = `${id}.${outputExt}`;
  const image = sharp(params.buffer, { failOn: 'error' }).rotate();
  let metadata: sharp.Metadata;
  let outputBuffer: Buffer;
  const outputMimeType = outputExt === 'webp' ? 'image/webp' : params.mimeType;
  try {
    metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error('invalid_image');
    if (assetType === 'avatar') {
      outputBuffer = await image.resize(512, 512, { fit: 'cover' }).webp({ quality: 86 }).toBuffer();
    } else {
      outputBuffer = await image.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).toBuffer();
    }
  } catch {
    throw new Error('invalid_image');
  }

  const relativePath = relativeAssetPath(params.userId, assetType, filename);
  const saved = await saveAssetObject(relativePath, outputBuffer, outputMimeType);
  const savedMetadata = {
    originalName: params.originalName || '',
    mimeType: outputMimeType,
    width: metadata.width,
    height: metadata.height,
  };
  await pgPool!.query(
    `INSERT INTO user_assets (id, user_id, asset_type, url, storage_provider, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [id, params.userId, assetType, saved.url, saved.provider, JSON.stringify(savedMetadata)]
  );
  if (assetType === 'avatar') {
    const userResult = await pgPool!.query(`SELECT metadata FROM users WHERE id = $1 LIMIT 1`, [params.userId]);
    const current = safeJsonObject(userResult.rows[0]?.metadata);
    await pgPool!.query(
      `UPDATE users SET metadata = $2::jsonb WHERE id = $1`,
      [params.userId, JSON.stringify({ ...current, avatarUrl: saved.url })]
    );
  }
  const rows = await pgPool!.query(`SELECT * FROM user_assets WHERE id = $1 LIMIT 1`, [id]);
  return mapAsset(rows.rows[0]);
}

export async function saveGeneratedImageAsset(params: {
  userId: string;
  assetType: UserAssetType;
  buffer: Buffer;
  extension: 'webp' | 'png' | 'jpg';
  mimeType: string;
  metadata?: Record<string, unknown>;
}): Promise<UserAsset> {
  await initStorage();
  requireDb();
  const assetType = assertAssetType(params.assetType);
  const id = newId('asset');

  const filename = `${id}.${params.extension}`;
  const relativePath = relativeAssetPath(params.userId, assetType, filename);
  const saved = await saveAssetObject(relativePath, params.buffer, params.mimeType);

  await pgPool!.query(
    `INSERT INTO user_assets (id, user_id, asset_type, url, storage_provider, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [id, params.userId, assetType, saved.url, saved.provider, JSON.stringify({ mimeType: params.mimeType, ...(params.metadata || {}) })]
  );
  const rows = await pgPool!.query(`SELECT * FROM user_assets WHERE id = $1 LIMIT 1`, [id]);
  return mapAsset(rows.rows[0]);
}

export async function listUserAssets(userId: string, assetType?: unknown): Promise<UserAsset[]> {
  await initStorage();
  requireDb();
  const normalizedType = assetType ? assertAssetType(assetType) : null;
  const rows = await pgPool!.query(
    `SELECT * FROM user_assets
     WHERE user_id = $1 AND ($2::text IS NULL OR asset_type = $2)
     ORDER BY created_at DESC
     LIMIT 80`,
    [userId, normalizedType]
  );
  return rows.rows.map(mapAsset);
}

export async function clearUserGeneratedCache(userId: string): Promise<{ removedAssets: number; removedFiles: number }> {
  await initStorage();
  requireDb();
  const client = await pgPool!.connect();
  try {
    await client.query('BEGIN');
    const rows = await client.query(
      `DELETE FROM user_assets
       WHERE user_id = $1 AND asset_type = ANY($2::text[])
       RETURNING url`,
      [userId, CACHE_ASSET_TYPES]
    );
    await client.query('COMMIT');

    let removedFiles = 0;
    for (const row of rows.rows) {
      const filePath = publicUrlToLocalPath(String(row.url || ''), userId);
      if (!filePath) continue;
      try {
        await fs.unlink(filePath);
        removedFiles += 1;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') {
          logger.warn('asset_cache_file_remove_failed', { filePath, message: (err as Error).message });
        }
      }
    }
    return { removedAssets: Number(rows.rowCount || 0), removedFiles };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
