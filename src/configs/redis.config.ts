import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const client = redisUrl
  ? new Redis(redisUrl, { maxRetriesPerRequest: null })
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: null,
    });

export const redisService = {
  async get(key: string): Promise<string | null> {
    return client.get(key);
  },
  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    await client.set(key, value, 'EX', ttlSeconds);
  },
  async del(key: string): Promise<void> {
    await client.del(key);
  },
  async delByPrefix(prefix: string): Promise<void> {
    const pattern = `${prefix}*`;
    let cursor = "0";

    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== "0");
  },
};

export { client as redisClient };

export const verifyRedisConnection = async (): Promise<void> => {
  await client.ping();
};
