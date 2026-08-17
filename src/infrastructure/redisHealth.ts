import { redisClient } from '../configs/redis.config';

/**
 * Timeout (ms) for the Redis health check. Prevents /ready from hanging if
 * Redis is unresponsive.
 */
const REDIS_CHECK_TIMEOUT_MS = 3000;

/**
 * Performs a lightweight Redis PING to determine whether Redis is reachable.
 *
 * Returns `true` on success, `false` on failure or timeout. Never throws.
 */
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const result = await Promise.race([
      redisClient.ping(),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('Redis health check timed out')), REDIS_CHECK_TIMEOUT_MS),
      ),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
};
