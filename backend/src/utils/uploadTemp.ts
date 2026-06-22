/**
 * 文件上传临时存储工具
 *
 * 提供基于 multer 的磁盘存储、上传文件读取和清理功能
 * 临时目录可通过 TRACECRAFT_UPLOAD_TMP_DIR 环境变量配置
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import multer from 'multer';

/** 临时上传根目录（默认使用系统临时目录） */
const TEMP_UPLOAD_ROOT = path.resolve(process.env.TRACECRAFT_UPLOAD_TMP_DIR || path.join(os.tmpdir(), 'tracecraft-uploads'));

/**
 * 创建 multer 磁盘存储引擎
 * @param prefix - 子目录前缀，用于分类存放不同类型的上传文件
 */
export function tempUploadStorage(prefix: string): multer.StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(TEMP_UPLOAD_ROOT, prefix);
      fs.mkdir(dir, { recursive: true })
        .then(() => cb(null, dir))
        .catch((error) => cb(error, dir));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 12);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  });
}

/**
 * 读取上传文件内容到 Buffer
 * 优先使用内存 buffer，其次读取磁盘文件路径
 */
export async function readUploadedFile(file?: Express.Multer.File): Promise<Buffer> {
  if (!file) return Buffer.alloc(0);
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFile(file.path);
  return Buffer.alloc(0);
}

/**
 * 清理上传的临时文件
 * 文件不存在时静默忽略，其他错误向上抛出
 */
export async function cleanupUploadedFile(file?: Express.Multer.File): Promise<void> {
  if (!file?.path) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
}
