import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AppDataSource } from '../configs/psqlDb.config';

/**
 * Maintenance job: Cleanup orphaned child records.
 */
const connection = new IORedis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), maxRetriesPerRequest: null });

const parentChildCleanupQueue = new Queue('maintenance:parent-child', { connection });

export const startParentChildCleanup = async () => {
  await parentChildCleanupQueue.add('cleanup', {}, {
    repeat: { pattern: '0 */6 * * *' },
  });

  const worker = new Worker('maintenance:parent-child', async () => {
    await AppDataSource.manager.query(`
      DELETE FROM "order_items" oi 
      WHERE NOT EXISTS (SELECT 1 FROM "orders" o WHERE o.id = oi."orderId")
    `);
    console.log('Parent-child cleanup completed');
  }, { connection });
  
  console.log('Parent-child cleanup job started');
};

