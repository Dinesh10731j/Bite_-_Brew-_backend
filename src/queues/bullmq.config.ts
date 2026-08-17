import { Queue, QueueOptions, WorkerOptions } from 'bullmq';
import { redisClient } from '../configs/redis.config';

/**
 * BullMQ configuration and connection.
 *
 * Reuses the shared Upstash Redis client so all replicas share the same
 * queue infrastructure. `maxRetriesPerRequest: null` is already configured on
 * the shared client (required by BullMQ).
 */
export const redisConnection = redisClient;

export const queueOptions: QueueOptions = { connection: redisConnection };
export const workerOptions: WorkerOptions = { connection: redisConnection };

/**
 * Create a new queue.
 */
export const createQueue = (name: string) => new Queue(name, queueOptions);
