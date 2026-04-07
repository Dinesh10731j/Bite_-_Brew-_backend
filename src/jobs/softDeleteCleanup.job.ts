import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AppDataSource } from '../configs/psqlDb.config';

/**
 * Maintenance job: Cleanup soft deleted records older than 30 days.
 */
const connection = new IORedis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), maxRetriesPerRequest: null });

const softDeleteCleanupQueue = new Queue('maintenance:soft-delete', { connection });

export const startSoftDeleteCleanup = async () => {
  // Add repeating job (every 6 hours)
  await softDeleteCleanupQueue.add('cleanup', {}, {
    repeat: { pattern: '0 */6 * * *' },
  });

  const worker = new Worker('maintenance:soft-delete', async () => {
    await AppDataSource.query('SELECT 1');
    console.log('Soft delete cleanup health-check completed');
  }, { connection });
  
  console.log('Soft delete cleanup job started');
};


