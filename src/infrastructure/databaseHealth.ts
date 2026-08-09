import { AppDataSource } from '../configs/psqlDb.config';
import { envConfig } from '../configs/env.config';

/**
 * Timeout (ms) for the database health check. Prevents /ready from hanging if
 * the database is unresponsive or the pool is exhausted.
 */
const DB_CHECK_TIMEOUT_MS = 3000;

/**
 * Performs a lightweight `SELECT 1` against the database to determine whether
 * the instance can execute queries.
 *
 * Returns `true` on success, `false` on failure or timeout. Never throws.
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!AppDataSource.isInitialized) {
      return false;
    }

    await Promise.race([
      AppDataSource.query('SELECT 1'),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('Database health check timed out')), DB_CHECK_TIMEOUT_MS)
      ),
    ]);
    return true;
  } catch {
    return false;
  }
};

/**
 * Returns current pool usage statistics (safe, non-sensitive).
 * Used for internal diagnostics / metrics.
 */
export const getDatabasePoolStats = (): {
  connected: boolean;
  poolMax: number;
} | null => {
  try {
    if (!AppDataSource.isInitialized) {
      return null;
    }
    return {
      connected: true,
      poolMax: envConfig.DB_POOL_MAX,
    };
  } catch {
    return null;
  }
};
