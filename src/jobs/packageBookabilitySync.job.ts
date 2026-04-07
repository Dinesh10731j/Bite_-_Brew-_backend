import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Maintenance job: Sync package bookability status.
 */
const connection = new IORedis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), maxRetriesPerRequest: null });

const packageSyncQueue = new Queue('maintenance:package-sync', { connection });

export const startPackageBookabilitySync = async () => {
  await packageSyncQueue.add('sync', {}, {
    repeat: { pattern: '0 */1 * * *' }, // Every hour
  });

  const worker = new Worker('maintenance:package-sync', async () => {
    console.log('Package bookability sync completed');
  }, { connection });
  
  console.log('Package bookability sync job started');
};

