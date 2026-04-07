import { redisService } from "../../configs/redis.config";

export const getCache = async <T>(key: string): Promise<{ cached: boolean; data: T | null }> => {
  const value = await redisService.get(key);
  if (!value) {
    return { cached: false, data: null };
  }
  try {
    return { cached: true, data: JSON.parse(value) as T };
  } catch {
    return { cached: true, data: (value as unknown) as T };
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds = 60): Promise<void> => {
  await redisService.set(key, JSON.stringify(value), ttlSeconds);
};

export const delCache = async (key: string): Promise<void> => {
  await redisService.del(key);
};

export const delCacheByPrefix = async (prefix: string): Promise<void> => {
  await redisService.delByPrefix(prefix);
};
