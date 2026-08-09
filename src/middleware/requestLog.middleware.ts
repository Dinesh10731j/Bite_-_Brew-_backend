import { NextFunction, Request, Response } from 'express';
import { logger } from '../infrastructure/logger';
import { getInstanceId } from '../configs/instance.config';

/**
 * Structured request logging middleware.
 *
 * Emits one JSON log entry per completed request containing:
 *   requestId, instanceId, method, route, statusCode, durationMs.
 *
 * This is the load-balancer-friendly replacement for the plain-text Morgan
 * logger. It logs on the `finish` event so the full lifecycle is captured.
 */
export const requestLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    logger.info('http.request', {
      requestId: req.requestId,
      instanceId: getInstanceId(),
      method: req.method,
      route: req.route?.path || req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
};
