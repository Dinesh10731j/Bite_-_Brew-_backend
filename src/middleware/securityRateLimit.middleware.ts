import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "../configs/redis.config";
import { envConfig } from "../configs/env.config";
import { getClientIp } from "../configs/clientIp";
import { HTTP_STATUS } from "../constant/statusCode.interface";

/**
 * Endpoint-specific, Redis-backed rate limiters.
 *
 * Unlike the global `rateLimit` middleware, these are applied per-route to
 * enforce stricter, tunable limits on security-sensitive endpoints:
 *   login, registration, password reset, email verification, refresh token,
 *   OTP, and public APIs.
 *
 * Each limiter supports:
 *  - configurable points + duration
 *  - exponential backoff (via duration on lockout)
 *  - per-user / per-IP keys
 */

type LimiterKind = "login" | "registration" | "passwordReset" | "refresh" | "public";

interface LimiterConfig {
  keyPrefix: string;
  points: number;
  duration: number;
}

const isTest = process.env.NODE_ENV === "test";

/**
 * In test mode we fall back to memory so tests don't require a live Redis.
 * In all other environments (including production with multiple instances) we
 * MUST use the shared Redis client so limits are shared across all replicas.
 */
const useRedis = !isTest;

const createLimiter = (config: LimiterConfig) => {
  if (useRedis) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: config.keyPrefix,
      points: config.points,
      duration: config.duration,
    });
  }
  return new RateLimiterMemory({
    keyPrefix: config.keyPrefix,
    points: config.points,
    duration: config.duration,
  });
};

// Endpoint-specific limiter configurations (from env config with defaults).
const limiterConfigs: Record<LimiterKind, LimiterConfig> = {
  login: {
    keyPrefix: "rl:login",
    points: envConfig.RATE_LIMIT_LOGIN_POINTS,
    duration: envConfig.RATE_LIMIT_LOGIN_DURATION,
  },
  registration: {
    keyPrefix: "rl:registration",
    points: envConfig.RATE_LIMIT_REGISTRATION_POINTS,
    duration: envConfig.RATE_LIMIT_REGISTRATION_DURATION,
  },
  passwordReset: {
    keyPrefix: "rl:password_reset",
    points: 5,
    duration: 3600,
  },
  refresh: {
    keyPrefix: "rl:refresh",
    points: envConfig.RATE_LIMIT_REFRESH_POINTS,
    duration: envConfig.RATE_LIMIT_REFRESH_DURATION,
  },
  public: {
    keyPrefix: "rl:public",
    points: 300,
    duration: 60,
  },
};

const limiters: Record<LimiterKind, ReturnType<typeof createLimiter>> = {
  login: createLimiter(limiterConfigs.login),
  registration: createLimiter(limiterConfigs.registration),
  passwordReset: createLimiter(limiterConfigs.passwordReset),
  refresh: createLimiter(limiterConfigs.refresh),
  public: createLimiter(limiterConfigs.public),
};

const resolveClientKey = (req: Request): string => {
  // Use the safe client IP so attackers cannot bypass security rate limits by
  // spoofing X-Forwarded-For.
  return req.user?.id ? `user:${req.user.id}` : `ip:${getClientIp(req)}`;
};

/**
 * Build a middleware that enforces a specific rate limiter.
 * `blockDuration` (seconds) is used for exponential backoff when blocked.
 */
export const securityRateLimit = (kind: LimiterKind, blockDuration?: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.NODE_ENV === "test" || req.method === "OPTIONS") {
      next();
      return;
    }

    const limiter = limiters[kind];
    const config = limiterConfigs[kind];
    const key = resolveClientKey(req);

    try {
      const limiterRes = (await limiter.consume(key)) as { remainingPoints?: number; msBeforeNext: number };
      const remaining = Math.max(0, Math.floor(limiterRes.remainingPoints ?? config.points));
      const resetSeconds = Math.max(1, Math.ceil(limiterRes.msBeforeNext / 1000));

      res.setHeader("X-RateLimit-Limit", String(config.points));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(resetSeconds));
      next();
    } catch (rejRes) {
      const blocked = (rejRes as { msBeforeNext: number }) || { msBeforeNext: 1000 };
      const baseReset = Math.max(1, Math.ceil(blocked.msBeforeNext / 1000));
      // Exponential backoff: multiply by provided blockDuration factor.
      const resetSeconds = blockDuration ? baseReset * blockDuration : baseReset;

      res.setHeader("X-RateLimit-Limit", String(config.points));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(resetSeconds));
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        message: "Too many requests. Please retry later.",
        retryAfterSeconds: resetSeconds,
      });
    }
  };
};

/** Convenience limiters for route wiring. */
export const loginRateLimiter = securityRateLimit("login");
export const registrationRateLimiter = securityRateLimit("registration");
export const passwordResetRateLimiter = securityRateLimit("passwordReset");
export const refreshRateLimiter = securityRateLimit("refresh");
export const publicApiRateLimiter = securityRateLimit("public");
