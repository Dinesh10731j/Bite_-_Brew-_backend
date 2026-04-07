import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AppDataSource } from '../configs/psqlDb.config';
import { User } from "../entities/user/user.entity";

/**
 * User metadata update queue worker.
 */
const connection = new IORedis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), maxRetriesPerRequest: null });

export const userMetadataWorker = new Worker('user-metadata', async (job) => {
  const { userId } = job.data;
  if (!userId) return;
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOneBy({ id: String(userId) });
  if (!user) return;
  user.updatedAt = new Date();
  await repo.save(user);
}, { connection });

