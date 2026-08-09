import type { Server as HttpServer } from 'http';
import { setShuttingDown } from '../configs/shutdownState';
import { envConfig } from '../configs/env.config';
import { logger } from './logger';

/**
 * Handles used by registered cleanup callbacks.
 */
type CleanupHandler = () => Promise<void> | void;

const cleanupHandlers = new Set<CleanupHandler>();

/**
 * Register a cleanup callback to run during graceful shutdown.
 * e.g. closing database pool, Redis, BullMQ workers.
 */
export const onShutdown = (handler: CleanupHandler): void => {
  cleanupHandlers.add(handler);
};

/**
 * Centralized graceful shutdown manager.
 *
 * Order of operations:
 *   1. Mark instance as shutting down → /ready returns 503 immediately.
 *   2. Stop accepting new connections (server.close()).
 *   3. Wait for in-flight requests to finish (respecting a drain timeout).
 *   4. Run all registered cleanup handlers (workers, Redis, DB).
 *   5. Exit the process.
 *
 * A hard timeout (SHUTDOWN_TIMEOUT_MS) guarantees the process cannot hang
 * forever if something refuses to drain.
 */
export const shutdown = async (
  server: HttpServer,
  signal: string,
  forceExit = false,
): Promise<void> => {
  if (forceExit) {
    logger.warn('shutdown.force', { signal, reason: 'forced exit' });
    process.exit(1);
  }

  // 1. Flip readiness off first so the load balancer stops routing traffic.
  setShuttingDown(true);
  logger.info('shutdown.started', { signal });

  // 2. Stop accepting new connections.
  const closePromise = new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  // 3. Wait for in-flight requests with a timeout.
  let drainTimer: NodeJS.Timeout | undefined;
  const drainTimeout = new Promise<void>((resolve) => {
    drainTimer = setTimeout(resolve, envConfig.SHUTDOWN_TIMEOUT_MS);
  });

  try {
    await Promise.race([closePromise, drainTimeout]);
    clearTimeout(drainTimer);
    logger.info('shutdown.httpServerClosed');
  } catch (error) {
    logger.warn('shutdown.httpServerCloseError', { error: String(error) });
  }

  // 4. Run cleanup handlers (workers, Redis, DB).
  for (const handler of cleanupHandlers) {
    try {
      await handler();
    } catch (error) {
      logger.warn('shutdown.cleanupError', { error: String(error) });
    }
  }

  // 5. Exit the process.
  logger.info('shutdown.complete');
  process.exit(0);
};

/**
 * Wire SIGTERM / SIGINT to the graceful shutdown sequence.
 */
export const registerSignalHandlers = (server: HttpServer): void => {
  const handleSignal = (signal: string): void => {
    void shutdown(server, signal);
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
};
