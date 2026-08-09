/**
 * Process-wide shutdown state.
 *
 * When this flag is set to true, the /ready endpoint immediately returns 503
 * so the load balancer stops routing new traffic to this instance during
 * graceful shutdown.
 *
 * This is intentionally a tiny, isolated module (no external deps) so it can
 * be imported safely by both the application and the health middleware without
 * creating circular dependencies.
 */
let isShuttingDown = false;

/**
 * Mark the instance as shutting down. Once set, readiness returns 503.
 */
export const setShuttingDown = (value = true): void => {
  isShuttingDown = value;
};

/**
 * Whether this instance is currently shutting down.
 */
export const getIsShuttingDown = (): boolean => isShuttingDown;
