import 'dotenv/config';
import { runMigrations } from '../services/migrationService';
import { logger } from '../services/logger';

runMigrations()
  .then((result) => {
    logger.info('migrate_done', { applied: result.applied, skipped: result.skipped.length });
  })
  .catch((error) => {
    logger.error('migrate_failed', error);
    process.exit(1);
  });
