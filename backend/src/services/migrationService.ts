import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pgModule from 'pg';
import { getConnectionString } from './postgres-storage';
import { logger } from './logger';

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

function migrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'db', 'migrations'),
    path.resolve(process.cwd(), '..', 'db', 'migrations'),
  ];
  return candidates.find((dir) => existsSync(dir)) || candidates[1];
}

async function ensureMigrationTable(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureUserAssetsTable(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INT NOT NULL DEFAULT 0,
      url TEXT NOT NULL DEFAULT '',
      storage_provider TEXT NOT NULL DEFAULT 'local',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'local'`);
  await client.query(`ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT 'application/octet-stream'`);
  await client.query(`ALTER TABLE user_assets ADD COLUMN IF NOT EXISTS size_bytes INT NOT NULL DEFAULT 0`);
}

async function listMigrationFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(migrationsDir());
    return files.filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** 运行 db/migrations 下的 SQL 文件；每个文件事务内执行并登记版本。 */
export async function runMigrations(): Promise<MigrationResult> {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('postgres_connection_string_missing');
  }

  const pool = new pgModule.Pool({ connectionString });
  const client = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];
  try {
    await ensureMigrationTable(client);
    await ensureUserAssetsTable(client);
    const files = await listMigrationFiles();
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1', [version]);
      if (existing.rows[0]) {
        skipped.push(version);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir(), file), 'utf8');
      logger.info('migration_run_start', { version, file });
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        applied.push(version);
      } catch (error) {
        logger.error('migration_run_failed', {
          version,
          file,
          message: error instanceof Error ? error.message : 'migration_failed',
        });
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return { applied, skipped };
  } finally {
    client.release();
    await pool.end();
  }
}
