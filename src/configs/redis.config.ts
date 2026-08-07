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

// ===== Security / Session Namespaced Helpers =====
// Redis key design:
//   session:{userId}        -> JSON: current active session for a user (single active session)
//   refresh:{tokenId}       -> JSON: refresh token metadata (rotation + reuse detection)
//   device:{deviceHash}     -> JSON: device metadata / risk signal
//   login_attempt:{ip}      -> counter: failed login attempts per IP
//   registration:{ip}       -> counter: registrations per IP
//   rate_limit:{key}        -> handled by rate-limiter-flexible (rl: prefix)
const securityRedis = {
  /**
   * Namespaced get.
   */
  async get(namespace: "session" | "refresh" | "device" | "login_attempt" | "registration", key: string): Promise<string | null> {
    return client.get(`${namespace}:${key}`);
  },

  /**
   * Namespaced set with TTL.
   */
  async set(
    namespace: "session" | "refresh" | "device" | "login_attempt" | "registration",
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await client.set(`${namespace}:${key}`, value, 'EX', ttlSeconds);
  },

  /**
   * Namespaced delete.
   */
  async del(namespace: "session" | "refresh" | "device" | "login_attempt" | "registration", key: string): Promise<void> {
    await client.del(`${namespace}:${key}`);
  },

  /**
   * Atomic counter increment with TTL on first write.
   * Returns the updated count.
   */
  async incr(namespace: "login_attempt" | "registration", key: string, ttlSeconds: number): Promise<number> {
    const fullKey = `${namespace}:${key}`;
    const count = await client.incr(fullKey);
    if (count === 1) {
      await client.expire(fullKey, ttlSeconds);
    }
    return count;
  },

  /**
   * Read the current counter value without incrementing.
   */
  async getCount(namespace: "login_attempt" | "registration", key: string): Promise<number> {
    const value = await client.get(`${namespace}:${key}`);
    return value ? parseInt(value, 10) : 0;
  },

  /**
   * Reset a counter (used after successful login / registration).
   */
  async reset(namespace: "login_attempt" | "registration", key: string): Promise<void> {
    await client.del(`${namespace}:${key}`);
  },

  /**
   * Namespaced scan-based deletion (e.g. revoke all sessions for a user).
   * Uses pipelining for performance.
   */
  async delByPrefix(namespace: "session" | "refresh" | "device", prefix: string): Promise<void> {
    const pattern = `${namespace}:${prefix}*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((k) => pipeline.del(k));
        await pipeline.exec();
      }
    } while (cursor !== "0");
  },

  /**
   * Set a key with no expiry (opsSet variant) - used for persistence across sessions.
   */
  async setKeep(namespace: "device", key: string, value: string): Promise<void> {
    await client.set(`${namespace}:${key}`, value);
  },
};

export { client as redisClient, securityRedis };

export const verifyRedisConnection = async (): Promise<void> => {
  await client.ping();
};
