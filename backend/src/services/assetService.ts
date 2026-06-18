import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { initStorage } from './storage';
import { pgPool } from './postgres-storage';
import { newId } from '../utils/id';
import { safeJsonObject } from '../utils/json';

export type UserAssetType = 'avatar' | 'share_poster' | 'route_preview' | 'qr_card';

export interface UserAsset {
  id: string;
  userId: string;
  assetType: UserAssetType;
  url: string;
  storageProvider: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ALLOWED_TYPES = new Set<UserAssetType>(['avatar', 'share_poster', 'route_preview', 'qr_card']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = Math.max(1, Number(process.env.TRACECRAFT_ASSET_MAX_MB || 5)) * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.env.TRACECRAFT_UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const PUBLIC_PREFIX = (process.env.TRACECRAFT_UPLOAD_PUBLIC_PATH || '/uploads').replace(/\/$/, '');
const CACHE_ASSET_TYPES: UserAssetType[] = ['share_poster', 'route_preview', 'qr_card'];

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
  const relativeDir = path.join('users', params.userId, assetType);
  const absoluteDir = path.join(UPLOAD_ROOT, relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const outputExt = assetType === 'avatar' ? 'webp' : ext;
  const filename = `${id}.${outputExt}`;
  const absolutePath = path.join(absoluteDir, filename);
  const image = sharp(params.buffer, { failOn: 'error' }).rotate();
  let metadata: sharp.Metadata;
  try {
    metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error('invalid_image');
    if (assetType === 'avatar') {
      await image.resize(512, 512, { fit: 'cover' }).webp({ quality: 86 }).toFile(absolutePath);
    } else {
      await image.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).toFile(absolutePath);
    }
  } catch {
    throw new Error('invalid_image');
  }

  const publicPath = `${PUBLIC_PREFIX}/${relativeDir.replace(/\\/g, '/')}/${filename}`;
  const savedMetadata = {
    originalName: params.originalName || '',
    mimeType: params.mimeType,
    width: metadata.width,
    height: metadata.height,
  };
  await pgPool!.query(
    `INSERT INTO user_assets (id, user_id, asset_type, url, storage_provider, metadata)
     VALUES ($1, $2, $3, $4, 'local', $5::jsonb)`,
    [id, params.userId, assetType, publicPath, JSON.stringify(savedMetadata)]
  );
  if (assetType === 'avatar') {
    const userResult = await pgPool!.query(`SELECT metadata FROM users WHERE id = $1 LIMIT 1`, [params.userId]);
    const current = safeJsonObject(userResult.rows[0]?.metadata);
    await pgPool!.query(
      `UPDATE users SET metadata = $2::jsonb WHERE id = $1`,
      [params.userId, JSON.stringify({ ...current, avatarUrl: publicPath })]
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
  const relativeDir = path.join('users', params.userId, assetType);
  const absoluteDir = path.join(UPLOAD_ROOT, relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const filename = `${id}.${params.extension}`;
  const absolutePath = path.join(absoluteDir, filename);
  await fs.writeFile(absolutePath, params.buffer);

  const publicPath = `${PUBLIC_PREFIX}/${relativeDir.replace(/\\/g, '/')}/${filename}`;
  await pgPool!.query(
    `INSERT INTO user_assets (id, user_id, asset_type, url, storage_provider, metadata)
     VALUES ($1, $2, $3, $4, 'local', $5::jsonb)`,
    [id, params.userId, assetType, publicPath, JSON.stringify({ mimeType: params.mimeType, ...(params.metadata || {}) })]
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
          console.warn('[asset:cache_file_remove_failed]', filePath, (err as Error).message);
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
