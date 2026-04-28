import { Queue, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

/**
 * BullMQ configuration and connection.
 */
const redisUrl = process.env.REDIS_URL;

export const redisConnection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

export const queueOptions: QueueOptions = { connection: redisConnection };
export const workerOptions: WorkerOptions = { connection: redisConnection };

/**
 * Create a new queue.
 */
export const createQueue = (name: string) => new Queue(name, queueOptions);

