import 'reflect-metadata';
import { createApp } from './configs/app';
import { AppDataSource } from './configs/psqlDb.config';
import { envConfig } from './configs/env.config';
import { verifySmtpConnection } from './configs/smtp.config';
import { redisClient, verifyRedisConnection } from './configs/redis.config';
import './queue/email.worker';

const { server } = createApp();
const basePort = Number(envConfig.PORT) || 7000;

const findFreePort = async (startingPort: number, maxRetries = 5): Promise<number> => {
  for (let port = startingPort; port < startingPort + maxRetries; port++) {
    const listener = server.listen(port, '127.0.0.1');
    await new Promise((resolve, reject) => {
      listener.on('listening', resolve);
      listener.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          listener.close();
          return;
        }
        reject(err);
      });
    }).catch(() => {}); // Continue on error
    listener.close();
    // Quick check if port free (simplified)
    return port;
  }
  throw new Error(`No free port found between ${startingPort}-${startingPort + maxRetries}`);
};

/**
 * Get pool statistics for logging
 */
const getPoolStats = (): string => {
  try {
    const pool = (AppDataSource.driver as any)?.postgres?.pool;
    if (!pool) return '';
    return `(connections: ${pool.totalCount}/${envConfig.DB_POOL_MAX}, idle: ${pool.idleCount})`;
  } catch {
    return '';
  }
};

const bootstrap = async (): Promise<void> => {
  try {
    // Initialize PostgreSQL connection with connection pooling
    console.log(`[DB] Initializing PostgreSQL connection pool...`);
    console.log(`[DB] Pool config: max=${envConfig.DB_POOL_MAX}, min=${envConfig.DB_POOL_MIN}, idleTimeout=${envConfig.DB_POOL_IDLE_TIMEOUT_MS}ms`);
    
    await AppDataSource.initialize();
    
    const poolStats = getPoolStats();
    console.log(`✓ [DB] PostgreSQL connected${poolStats ? ` ${poolStats}` : ''}`);

    // Run migrations if not in test mode and not disabled
    if (process.env.NODE_ENV !== 'test' && process.env.RUN_MIGRATIONS !== 'false') {
      console.log(`[DB] Running migrations...`);
      const migrations = await AppDataSource.runMigrations();
      console.log(`✓ [DB] ${migrations.length} migrations applied`);
    } else {
      console.log(`[DB] Migrations skipped`);
    }

    // Verify SMTP connection
    try {
      await verifySmtpConnection();
      console.log('✓ [SMTP] SMTP connected successfully');
    } catch (error) {
      console.error('✗ [SMTP] SMTP connection failed', error);
    }

    // Verify Redis connection
    try {
      await verifyRedisConnection();
      console.log('✓ [Redis] Redis connected successfully');
    } catch (error) {
      console.error('✗ [Redis] Redis connection failed', error);
    }

    // Find available port and start server
    const port = await findFreePort(basePort);
    server.listen(port, '0.0.0.0', () => {
      console.log(`✓ [Server] Running on http://localhost:${port} (PID: ${process.pid})`);
    });

    /**
     * Graceful shutdown handler
     * 
     * Closes connections in this order:
     * 1. HTTP server (stops accepting new requests)
     * 2. Redis client (flushes pending operations)
     * 3. Database connection pool (closes all idle + active connections)
     * 
     * This prevents connection leaks and ensures clean shutdown.
     */
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Gracefully shutting down...`);
      
      server.close(async () => {
        console.log('[Shutdown] HTTP server closed');
        
        // Close Redis connection
        try {
          await redisClient.quit();
          console.log('[Shutdown] Redis connection closed');
        } catch (_error) {
          // Ignore quit errors during shutdown
        }

        // Close database connection pool
        try {
          const poolStats = getPoolStats();
          console.log(`[Shutdown] Closing database pool${poolStats ? ` ${poolStats}` : ''}...`);
          await AppDataSource.destroy();
          console.log('[Shutdown] Database connection pool closed');
        } catch (error) {
          console.error('[Shutdown] Error closing database pool:', error);
        }

        console.log('[Shutdown] Process exiting');
        process.exit(0);
      });

      // Force shutdown if graceful takes too long (30s)
      setTimeout(() => {
        console.error('[Shutdown] Graceful shutdown timeout exceeded. Force exiting.');
        process.exit(1);
      }, 30000);
    };

    // Register signal handlers for graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions (log but don't crash)
    process.on('uncaughtException', (error: Error) => {
      console.error('[Error] Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      console.error('[Error] Unhandled Rejection:', reason);
    });

  } catch (err: unknown) {
    console.error('✗ [Bootstrap] Application startup failed:', err);
    process.exit(1);
  }
};

void bootstrap();
