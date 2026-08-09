import { randomUUID } from 'crypto';

/**
 * Resolves a stable, unique instance identifier for this API process.
 *
 * Priority:
 *   1. Explicit INSTANCE_ID env var (e.g. "api-01")
 *   2. Kubernetes POD_NAME / HOSTNAME (container ID)
 *   3. A safely generated random UUID (fallback)
 *
 * The returned ID is safe to expose in internal diagnostics and logs (it
 * contains no credentials, internal IPs, or secrets).
 */
const resolveInstanceId = (): string => {
  // 1. Explicit configuration wins.
  const explicit = process.env.INSTANCE_ID?.trim();
  if (explicit) {
    return explicit;
  }

  // 2. Kubernetes injects POD_NAME into the container environment.
  const podName = process.env.POD_NAME?.trim();
  if (podName) {
    return podName;
  }

  // 3. Container hostname (Docker) is a reasonable container identifier.
  const hostname = process.env.HOSTNAME?.trim();
  if (hostname) {
    return hostname;
  }

  // 4. Safe random fallback. UUID is safe to expose (not sensitive).
  return randomUUID();
};

export const instanceId: string = resolveInstanceId();

/**
 * Decorated instance ID for structured logging / metrics.
 */
export const getInstanceId = (): string => instanceId;
