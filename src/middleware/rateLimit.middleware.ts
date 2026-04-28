import { NextFunction, Request, Response } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import IORedis from 'ioredis';

type LimiterResponse = {
  remainingPoints?: number;
  msBeforeNext: number;
};

const isTest = process.env.NODE_ENV === 'test';
const redisUrl = process.env.REDIS_URL;

const redisClient =
  !isTest && redisUrl
    ? new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: true,
      })
    : null;

const createLimiter = (opts: { keyPrefix: string; points: number; duration: number }) => {
  if (redisClient) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: opts.keyPrefix,
      points: opts.points,
      duration: opts.duration,
    });
  }

  return new RateLimiterMemory({
    keyPrefix: opts.keyPrefix,
    points: opts.points,
    duration: opts.duration,
  });
};

// Auth routes are intentionally stricter to reduce brute-force risk.
const authLimiter = createLimiter({ keyPrefix: 'rl:auth', points: 80, duration: 60 });
// Read-heavy endpoints tolerate polling/Web app refresh patterns.
const readLimiter = createLimiter({ keyPrefix: 'rl:read', points: 900, duration: 60 });
// Non-idempotent operations remain tighter to protect write paths.
const writeLimiter = createLimiter({ keyPrefix: 'rl:write', points: 240, duration: 60 });

const isBypassedPath = (path: string): boolean => {
  return path === '/livez' || path === '/readyz' || path === '/metrics' || path.endsWith('/health');
};

const resolveClientKey = (req: Request): string => {
  return (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`) as string;
};

const setRateHeaders = (
  res: Response,
  maxPoints: number,
  limiterRes: LimiterResponse,
  limited: boolean,
): void => {
  const remaining = limited
    ? 0
    : Math.max(0, Math.floor(limiterRes.remainingPoints ?? maxPoints));
  const resetSeconds = Math.max(1, Math.ceil(limiterRes.msBeforeNext / 1000));

  res.setHeader('X-RateLimit-Limit', String(maxPoints));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetSeconds));
  if (limited) {
    res.setHeader('Retry-After', String(resetSeconds));
  }
};

export const rateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (process.env.NODE_ENV === 'test' || req.method === 'OPTIONS' || isBypassedPath(req.path)) {
    next();
    return;
  }

  const isAuth = req.originalUrl.includes('/auth');
  const isReadMethod = req.method === 'GET' || req.method === 'HEAD';

  const limiter = isAuth ? authLimiter : isReadMethod ? readLimiter : writeLimiter;
  const maxPoints = isAuth ? 80 : isReadMethod ? 900 : 240;
  const key = resolveClientKey(req);

  try {
    const limiterRes = (await limiter.consume(key)) as LimiterResponse;
    setRateHeaders(res, maxPoints, limiterRes, false);
    next();
  } catch (rejRes) {
    const blocked = (rejRes as LimiterResponse) || { msBeforeNext: 1000 };
    setRateHeaders(res, maxPoints, blocked, true);
    res.status(429).json({
      message: 'Too many requests. Please retry later.',
      retryAfterSeconds: Math.max(1, Math.ceil(blocked.msBeforeNext / 1000)),
    });
  }
};
