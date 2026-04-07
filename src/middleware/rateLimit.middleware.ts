import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate limiting middleware using rate-limiter-flexible.
 */
const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 points
  duration: 60, // per 1 minute
});

/**
 * Apply rate limit based on IP.
 */
export const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip as any);
    next();
  } catch (rejRes) {
  res.status(429).json({ message: `Rate limit exceeded. Retry in ${(rejRes as any).msBeforeNext / 1000}s.` });
  }
};

