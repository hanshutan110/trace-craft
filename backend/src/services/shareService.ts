/**
 * TraceCraft 分享服务
 *
 * 职责：
 *   - 生成跑步成绩分享海报（SVG → WebP）
 *   - 生成用户个人二维码名片
 *   - 记录分享行为到 route_share_records
 */
import sharp from 'sharp';
import { initStorage, getRouteRecord, getSessionRecord } from './storage';
import { pgPool } from './postgres-storage';
import { saveGeneratedImageAsset, type UserAsset } from './assetService';
import { getUserProfile } from './profileService';
import { newId } from '../utils/id';
import type { GeoPoint, Session } from '../../../shared/types';

/** 分享海报生成结果 */
export interface ShareCardResult {
  asset: UserAsset;
  shareRecord: {
    id: string;
    channel: string;
    routeId: string | null;
    sessionId: string | null;
    createdAt: string;
  };
}

/** 二维码名片生成结果 */
export interface QrCardResult {
  asset: UserAsset;
}

/** 支持的分享渠道 */
const CHANNELS = new Set(['wechat', 'moments', 'xiaohongshu', 'douyin', 'poster', 'system']);

function requireDb(): void {
  if (!pgPool) throw new Error('postgres_not_configured');
}

/** XML 特殊字符转义 */
function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 米制距离格式化为 "X.XX km" */
function formatKm(value: number): string {
  return `${(Math.max(0, value) / 1000).toFixed(2)} km`;
}

/** 秒数格式化为 "H:MM:SS" 或 "M:SS" */
function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** 将经纬度坐标序列转换为 SVG path 指令 */
function routePath(points: GeoPoint[]): string {
  if (points.length < 2) return 'M 160 220 C 220 120 360 120 420 220 S 560 320 640 220';
  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  const minLng = Math.min(...points.map((p) => p.lng));
  const maxLng = Math.max(...points.map((p) => p.lng));
  const latSpan = Math.max(0.000001, maxLat - minLat);
  const lngSpan = Math.max(0.000001, maxLng - minLng);
  return points.map((point, index) => {
    const x = 96 + ((point.lng - minLng) / lngSpan) * 588;
    const y = 530 - ((point.lat - minLat) / latSpan) * 340;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

/** 生成分享海报 SVG（成绩卡片 + 路线图形 + 统计数据） */
function shareSvg(params: {
  title: string;
  shapeType: string;
  distanceM: number;
  plannedM: number;
  durationSec: number;
  completionRate: number;
  avgDeviationM: number;
  points: GeoPoint[];
}): string {
  const path = routePath(params.points);
  return `
<svg width="900" height="1200" viewBox="0 0 900 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7fbff"/>
      <stop offset="0.45" stop-color="#eef9ff"/>
      <stop offset="1" stop-color="#e9fff7"/>
    </linearGradient>
    <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4FACFE"/>
      <stop offset="1" stop-color="#12D8A7"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#0f766e" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="900" height="1200" fill="url(#bg)"/>
  <rect x="58" y="70" width="784" height="1060" rx="44" fill="#ffffff" opacity="0.88" filter="url(#soft)"/>
  <text x="96" y="145" fill="#0f172a" font-size="34" font-family="Arial, sans-serif" font-weight="800">TraceCraft</text>
  <text x="96" y="190" fill="#64748b" font-size="18" font-family="Arial, sans-serif">Run your city into a shape</text>
  <text x="96" y="266" fill="#0f172a" font-size="48" font-family="Arial, sans-serif" font-weight="900">${escapeXml(params.title)}</text>
  <text x="96" y="318" fill="#64748b" font-size="24" font-family="Arial, sans-serif">${escapeXml(params.shapeType)} route</text>
  <rect x="88" y="380" width="724" height="250" rx="30" fill="#f8fafc"/>
  <path d="${path}" fill="none" stroke="#dbeafe" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${path}" fill="none" stroke="url(#route)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="96" cy="530" r="9" fill="#0f172a" opacity="0.75"/>
  <g font-family="Arial, sans-serif">
    <text x="96" y="735" fill="#64748b" font-size="19" font-weight="700">DISTANCE</text>
    <text x="96" y="792" fill="#0f172a" font-size="46" font-weight="900">${formatKm(params.distanceM)}</text>
    <text x="488" y="735" fill="#64748b" font-size="19" font-weight="700">DURATION</text>
    <text x="488" y="792" fill="#0f172a" font-size="46" font-weight="900">${formatDuration(params.durationSec)}</text>
    <text x="96" y="895" fill="#64748b" font-size="19" font-weight="700">COMPLETION</text>
    <text x="96" y="952" fill="#0f172a" font-size="46" font-weight="900">${Math.round(params.completionRate)}%</text>
    <text x="488" y="895" fill="#64748b" font-size="19" font-weight="700">AVG DEVIATION</text>
    <text x="488" y="952" fill="#0f172a" font-size="46" font-weight="900">${Math.round(params.avgDeviationM)} m</text>
    <text x="96" y="1058" fill="#64748b" font-size="20">Planned ${formatKm(params.plannedM)} · Generated by TraceCraft</text>
  </g>
</svg>`;
}

function sessionDuration(session: Session | null): number {
  if (!session?.startedAt) return 0;
  const start = new Date(session.startedAt).getTime();
  const end = session.finishedAt ? new Date(session.finishedAt).getTime() : Date.now();
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? Math.round((end - start) / 1000) : 0;
}

function pseudoQrCells(seed: string): string {
  const hash = Buffer.from(seed).toString('base64url');
  const cells: string[] = [];
  for (let y = 0; y < 21; y += 1) {
    for (let x = 0; x < 21; x += 1) {
      const inFinder =
        (x < 7 && y < 7) ||
        (x >= 14 && y < 7) ||
        (x < 7 && y >= 14);
      if (inFinder) continue;
      const code = hash.charCodeAt((x + y * 21) % hash.length);
      if ((code + x * 3 + y * 5) % 3 === 0) {
        cells.push(`<rect x="${80 + x * 10}" y="${340 + y * 10}" width="8" height="8" rx="1.5" fill="#0f172a"/>`);
      }
    }
  }
  return cells.join('');
}

function finder(x: number, y: number): string {
  return `
    <rect x="${x}" y="${y}" width="70" height="70" rx="8" fill="#0f172a"/>
    <rect x="${x + 10}" y="${y + 10}" width="50" height="50" rx="5" fill="#ffffff"/>
    <rect x="${x + 22}" y="${y + 22}" width="26" height="26" rx="4" fill="#0f172a"/>`;
}

/** 生成用户个人二维码名片 SVG */
function qrCardSvg(params: {
  userId: string;
  displayName: string;
  signature: string;
  badge: string;
  totalDistanceKm: number;
}): string {
  const qrSeed = `tracecraft:user:${params.userId}`;
  return `
<svg width="900" height="1200" viewBox="0 0 900 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7fbff"/>
      <stop offset="0.52" stop-color="#edf7ff"/>
      <stop offset="1" stop-color="#eafff8"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4FACFE"/>
      <stop offset="1" stop-color="#12D8A7"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#0f766e" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="900" height="1200" fill="url(#bg)"/>
  <rect x="70" y="74" width="760" height="1052" rx="46" fill="#ffffff" filter="url(#shadow)"/>
  <text x="120" y="160" fill="#0f172a" font-size="38" font-family="Arial, sans-serif" font-weight="900">TraceCraft</text>
  <text x="120" y="205" fill="#64748b" font-size="20" font-family="Arial, sans-serif">Runner Card</text>
  <circle cx="450" cy="282" r="74" fill="url(#brand)"/>
  <text x="450" y="304" text-anchor="middle" fill="#ffffff" font-size="58" font-family="Arial, sans-serif" font-weight="900">${escapeXml(params.displayName.slice(0, 1) || 'T')}</text>
  <rect x="70" y="386" width="760" height="410" fill="#f8fafc"/>
  <rect x="72" y="388" width="756" height="406" fill="#ffffff" opacity="0.58"/>
  ${finder(80, 340)}
  ${finder(220, 340)}
  ${finder(80, 480)}
  ${pseudoQrCells(qrSeed)}
  <rect x="405" y="430" width="90" height="90" rx="18" fill="#ffffff"/>
  <rect x="418" y="443" width="64" height="64" rx="14" fill="url(#brand)"/>
  <path d="M446 464 A7 7 0 1 1 460 464 M451 474 L463 490 L448 505 L476 514" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="450" y="884" text-anchor="middle" fill="#0f172a" font-size="44" font-family="Arial, sans-serif" font-weight="900">${escapeXml(params.displayName)}</text>
  <text x="450" y="932" text-anchor="middle" fill="#64748b" font-size="22" font-family="Arial, sans-serif">${escapeXml(params.badge)} · ${params.totalDistanceKm.toFixed(1)} km</text>
  <text x="450" y="1000" text-anchor="middle" fill="#334155" font-size="24" font-family="Arial, sans-serif">${escapeXml(params.signature)}</text>
  <text x="450" y="1066" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif">${escapeXml(params.userId)}</text>
</svg>`;
}

/** 生成用户二维码名片（SVG → WebP → 保存资源） */
export async function createUserQrCard(userId: string): Promise<QrCardResult> {
  const profile = await getUserProfile(userId);
  const stats = profile.stats as { totalDistanceKm?: number } | undefined;
  const svg = qrCardSvg({
    userId,
    displayName: String(profile.displayName || 'TraceCraft Runner'),
    signature: String(profile.signature || ''),
    badge: String(profile.badge || 'Runner'),
    totalDistanceKm: Number(stats?.totalDistanceKm || 0),
  });
  const image = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  const asset = await saveGeneratedImageAsset({
    userId,
    assetType: 'qr_card',
    buffer: image,
    extension: 'webp',
    mimeType: 'image/webp',
    metadata: { userId, width: 900, height: 1200 },
  });
  return { asset };
}

/** 生成跑步成绩分享海报（SVG → WebP → 记录分享行为） */
export async function createShareCard(userId: string, params: {
  routeId?: unknown;
  sessionId?: unknown;
  channel?: unknown;
}): Promise<ShareCardResult> {
  await initStorage();
  requireDb();
  const sessionId = typeof params.sessionId === 'string' && params.sessionId ? params.sessionId : null;
  const session = sessionId ? await getSessionRecord(sessionId, userId) : null;
  const routeId = typeof params.routeId === 'string' && params.routeId ? params.routeId : session?.routeId || null;
  if (!routeId) throw new Error('share_route_required');
  const route = await getRouteRecord(routeId, userId);
  if (!route) throw new Error('route_not_found');
  const channel = typeof params.channel === 'string' && CHANNELS.has(params.channel) ? params.channel : 'poster';
  const metrics = session?.metrics || {};
  const actualPath = Array.isArray(session?.actualPath) && session!.actualPath.length ? session!.actualPath : route.points;
  const distanceM = Number(metrics.actualDistanceM || route.actualDistanceM || route.meta?.distanceM || 0);
  const plannedM = Number(metrics.plannedDistanceM || route.meta?.distanceM || distanceM);
  const durationSec = Number(metrics.timeSec || sessionDuration(session));
  const completionRate = Number(metrics.completionRate || (plannedM > 0 ? Math.min(100, Math.round((distanceM / plannedM) * 100)) : 0));
  const avgDeviationM = Number(metrics.avgDeviationM || 0);
  const svg = shareSvg({
    title: route.source?.filename || `${route.shapeType || 'Creative'} Run`,
    shapeType: route.shapeType || 'creative',
    distanceM,
    plannedM,
    durationSec,
    completionRate,
    avgDeviationM,
    points: actualPath,
  });
  const image = await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  const asset = await saveGeneratedImageAsset({
    userId,
    assetType: 'share_poster',
    buffer: image,
    extension: 'webp',
    mimeType: 'image/webp',
    metadata: { routeId, sessionId, channel, width: 900, height: 1200 },
  });
  const shareId = newId('share');
  await pgPool!.query(
    `INSERT INTO route_share_records (id, user_id, route_id, session_id, channel, share_payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [shareId, userId, route.id, session?.id || null, channel, JSON.stringify({ assetId: asset.id, url: asset.url })]
  );
  const rows = await pgPool!.query(`SELECT id, channel, route_id, session_id, created_at FROM route_share_records WHERE id = $1`, [shareId]);
  const row = rows.rows[0];
  return {
    asset,
    shareRecord: {
      id: row.id,
      channel: row.channel,
      routeId: row.route_id,
      sessionId: row.session_id,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    },
  };
}
