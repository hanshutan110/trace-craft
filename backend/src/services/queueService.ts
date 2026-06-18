/**
 * TraceCraft BullMQ 任务队列
 *
 * 职责：
 *   - 异步生成分享海报（SVG → WebP），避免阻塞 HTTP 请求
 *   - 异步生成用户二维码名片
 *   - 定时清理过期位置事件和审计日志
 *   - Redis 不可用时所有任务走同步降级路径
 */

import { Queue, Worker, type Job } from 'bullmq';
import { getRedisClient, isRedisConnected } from './redisService';
import { createShareCard, createUserQrCard } from './shareService';
import { pgPool } from './postgres-storage';

// ===== 任务类型定义 =====

/** 分享海报任务参数 */
export interface ShareCardJobData {
  userId: string;
  routeId?: string;
  sessionId?: string;
  channel?: string;
}

/** 二维码名片任务参数 */
export interface QrCardJobData {
  userId: string;
}

/** 任务结果 */
export interface AssetJobResult {
  assetId: string;
  url: string;
}

/** 清理任务参数 */
interface CleanupJobData {
  type: 'location_events' | 'audit_logs';
  olderThanDays: number;
}

// ===== 队列实例 =====

let shareCardQueue: Queue<ShareCardJobData> | null = null;
let qrCardQueue: Queue<QrCardJobData> | null = null;
let cleanupQueue: Queue<CleanupJobData> | null = null;

let shareCardWorker: Worker<ShareCardJobData> | null = null;
let qrCardWorker: Worker<QrCardJobData> | null = null;
let cleanupWorker: Worker<CleanupJobData> | null = null;

let initialized = false;

/**
 * 初始化 BullMQ 队列和 Worker
 *
 * Redis 不可用时跳过初始化，所有入队函数返回 null
 */
export async function initQueues(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!isRedisConnected()) {
    console.log('[queue] Redis not available, BullMQ queues disabled (sync fallback)');
    return;
  }

  // BullMQ 自带 ioredis 副本，需要 as any 桥接避免类型冲突
  const connection = getRedisClient() as any;

  // 分享海报队列
  shareCardQueue = new Queue<ShareCardJobData>('share-card', { connection });
  shareCardWorker = new Worker<ShareCardJobData>(
    'share-card',
    async (job: Job<ShareCardJobData>) => {
      const { userId, routeId, sessionId, channel } = job.data;
      const result = await createShareCard(userId, { routeId, sessionId, channel });
      return { assetId: result.asset.id, url: result.asset.url };
    },
    { connection, concurrency: 2 },
  );
  shareCardWorker.on('failed', (job, err) => {
    console.warn(`[queue:share-card] job ${job?.id} failed:`, err.message);
  });

  // 二维码名片队列
  qrCardQueue = new Queue<QrCardJobData>('qr-card', { connection });
  qrCardWorker = new Worker<QrCardJobData>(
    'qr-card',
    async (job: Job<QrCardJobData>) => {
      const result = await createUserQrCard(job.data.userId);
      return { assetId: result.asset.id, url: result.asset.url };
    },
    { connection, concurrency: 2 },
  );
  qrCardWorker.on('failed', (job, err) => {
    console.warn(`[queue:qr-card] job ${job?.id} failed:`, err.message);
  });

  // 定时清理队列
  cleanupQueue = new Queue<CleanupJobData>('cleanup', { connection });
  cleanupWorker = new Worker<CleanupJobData>(
    'cleanup',
    async (job: Job<CleanupJobData>) => {
      const { type, olderThanDays } = job.data;
      if (!pgPool) return { removed: 0 };
      const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
      if (type === 'location_events') {
        const result = await pgPool.query(
          `DELETE FROM run_location_events
           WHERE session_id IN (
             SELECT id FROM run_sessions WHERE finished_at IS NOT NULL AND finished_at < $1
           )`,
          [cutoff],
        );
        return { removed: Number(result.rowCount || 0) };
      }
      if (type === 'audit_logs') {
        const result = await pgPool.query(
          `DELETE FROM run_audit_logs WHERE created_at < $1`,
          [cutoff],
        );
        return { removed: Number(result.rowCount || 0) };
      }
      return { removed: 0 };
    },
    { connection, concurrency: 1 },
  );

  // 添加定时清理任务（每天凌晨执行）
  if (cleanupQueue) {
    await cleanupQueue.add(
      'cleanup-location-events',
      { type: 'location_events', olderThanDays: 90 },
      { repeat: { pattern: '0 3 * * *' }, jobId: 'cleanup-location-daily' },
    );
    await cleanupQueue.add(
      'cleanup-audit-logs',
      { type: 'audit_logs', olderThanDays: 180 },
      { repeat: { pattern: '0 4 * * *' }, jobId: 'cleanup-audit-daily' },
    );
  }

  console.log('[queue] BullMQ queues initialized (share-card, qr-card, cleanup)');
}

// ===== 入队函数 =====

/**
 * 提交异步分享海报生成任务
 *
 * @returns 任务 ID（可用于轮询状态），Redis 不可用时返回 null
 */
export async function enqueueShareCard(data: ShareCardJobData): Promise<string | null> {
  if (!shareCardQueue) return null;
  const job = await shareCardQueue.add('generate', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 7200 },
  });
  return job.id || null;
}

/**
 * 提交异步二维码名片生成任务
 *
 * @returns 任务 ID，Redis 不可用时返回 null
 */
export async function enqueueQrCard(userId: string): Promise<string | null> {
  if (!qrCardQueue) return null;
  const job = await qrCardQueue.add('generate', { userId }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 7200 },
  });
  return job.id || null;
}

/**
 * 手动触发一次数据清理（管理员操作）
 */
export async function enqueueManualCleanup(type: 'location_events' | 'audit_logs', olderThanDays: number = 90): Promise<string | null> {
  if (!cleanupQueue) return null;
  const job = await cleanupQueue.add('manual-cleanup', { type, olderThanDays });
  return job.id || null;
}

// ===== 状态查询 =====

/** 任务状态枚举 */
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'not_found';

/** 查询任务状态和结果 */
export async function getJobStatus(queueName: string, jobId: string): Promise<{
  status: JobStatus;
  result?: AssetJobResult;
  error?: string;
}> {
  const queue = queueName === 'share-card' ? shareCardQueue
    : queueName === 'qr-card' ? qrCardQueue
    : queueName === 'cleanup' ? cleanupQueue
    : null;

  if (!queue) return { status: 'not_found' };

  try {
    const job = await queue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    if (state === 'completed') {
      return { status: 'completed', result: job.returnvalue as AssetJobResult };
    }
    if (state === 'failed') {
      return { status: 'failed', error: String(job.failedReason || 'unknown_error') };
    }
    return { status: state as JobStatus };
  } catch {
    return { status: 'not_found' };
  }
}

// ===== 生命周期 =====

/** 关闭所有队列和 Worker */
export async function closeQueues(): Promise<void> {
  const closeables = [
    shareCardWorker, qrCardWorker, cleanupWorker,
    shareCardQueue, qrCardQueue, cleanupQueue,
  ];
  for (const item of closeables) {
    if (item) {
      try {
        await item.close();
      } catch {
        // 忽略关闭错误
      }
    }
  }
  shareCardQueue = null;
  qrCardQueue = null;
  cleanupQueue = null;
  shareCardWorker = null;
  qrCardWorker = null;
  cleanupWorker = null;
}
