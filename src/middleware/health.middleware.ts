import { Request, Response } from 'express';
import { getInstanceId } from '../configs/instance.config';
import { getIsShuttingDown } from '../configs/shutdownState';
import { checkDatabaseHealth } from '../infrastructure/databaseHealth';
import { checkRedisHealth } from '../infrastructure/redisHealth';

/**
 * GET /health — Liveness probe.
 *
 * Only verifies the Node.js process is alive. Must NOT execute expensive
 * database or Redis queries. Returns 200 with a minimal payload.
 */
export const healthHandler = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    instance: getInstanceId(),
  });
};

/**
 * GET /ready — Readiness probe.
 *
 * Verifies critical dependencies (PostgreSQL + Redis) and that the instance is
 * NOT shutting down. Returns 200 when ready, 503 when not.
 *
 * If the instance is shutting down, it returns 503 immediately so the load
 * balancer stops routing new traffic.
 *
 * Never exposes credentials, connection strings, internal IPs, or stack traces.
 */
export const readinessHandler = async (_req: Request, res: Response): Promise<void> => {
  // During graceful shutdown, never accept new production traffic.
  if (getIsShuttingDown()) {
    res.status(503).json({
      status: 'not_ready',
      instance: getInstanceId(),
      reason: 'shutting_down',
    });
    return;
  }

  const [databaseOk, redisOk] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const checks = {
    database: databaseOk ? 'ok' : 'failed',
    redis: redisOk ? 'ok' : 'failed',
  };

  const ready = databaseOk && redisOk;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    instance: getInstanceId(),
    checks,
  });
};
