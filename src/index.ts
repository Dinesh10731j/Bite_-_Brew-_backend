import 'reflect-metadata';
import { createApp } from './configs/app';
import { AppDataSource } from './configs/psqlDb.config';
import { envConfig } from './configs/env.config';
import { verifySmtpConnection } from './configs/smtp.config';
import { redisClient, verifyRedisConnection } from './configs/redis.config';
import { getInstanceId } from './configs/instance.config';
import { initObservability } from './observability/telemetryInit';
import { onShutdown, registerSignalHandlers } from './infrastructure/shutdown';
import { logger } from './infrastructure/logger';
import { emailWorker } from './queue/email.worker';

initObservability();

logger.info('instance.start', { instance: getInstanceId(), node: process.version, pid: process.pid });

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
    logger.info('db.init', {
      poolMax: envConfig.DB_POOL_MAX,
      poolMin: envConfig.DB_POOL_MIN,
      idleTimeoutMs: envConfig.DB_POOL_IDLE_TIMEOUT_MS,
    });

    await AppDataSource.initialize();

    const poolStats = getPoolStats();
    logger.info('db.connected', poolStats ? { poolStats } : {});

    // Run migrations if not in test mode and not disabled
    if (process.env.NODE_ENV !== 'test' && process.env.RUN_MIGRATIONS !== 'false') {
      logger.info('db.migrating');
      try {
        const migrations = await AppDataSource.runMigrations();
        logger.info('db.migrationsApplied', { count: migrations.length });
      } catch (migrationError) {
        logger.warn('db.migrationWarning', { error: String(migrationError) });
      }
    } else {
      logger.info('db.migrationsSkipped');
    }

    // Ensure loyalty_transactions table has required columns for the entity
    // This handles cases where synchronize is disabled or table was created before entity updates.
    // NOTE: This is idempotent and safe to run on every replica (uses IF NOT EXISTS checks).
    try {
      await AppDataSource.query(`
        DO $$
        BEGIN
          -- Add missing columns that the LoyaltyTransaction entity expects
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'loyalty_transactions' AND column_name = 'balance_after'
          ) THEN
            ALTER TABLE loyalty_transactions ADD COLUMN balance_after int;
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'loyalty_transactions' AND column_name = 'source_type'
          ) THEN
            ALTER TABLE loyalty_transactions ADD COLUMN source_type varchar(40);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'loyalty_transactions' AND column_name = 'source_id'
          ) THEN
            ALTER TABLE loyalty_transactions ADD COLUMN source_id varchar(80);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'loyalty_transactions' AND column_name = 'metadata'
          ) THEN
            ALTER TABLE loyalty_transactions ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
          END IF;

          -- Fix type column: widen to varchar(30) (entity defines length: 30)
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'loyalty_transactions' AND column_name = 'type' AND character_maximum_length < 30
          ) THEN
            ALTER TABLE loyalty_transactions ALTER COLUMN type TYPE varchar(30);
          END IF;

          -- Drop and recreate the CHECK constraint to include ADJUSTMENT (entity defines 4 types)
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'transaction_type_check' AND table_name = 'loyalty_transactions'
          ) THEN
            ALTER TABLE loyalty_transactions DROP CONSTRAINT transaction_type_check;
          END IF;

          -- Re-add a more inclusive CHECK matching the entity's LoyaltyTransactionType
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'transaction_type_check' AND table_name = 'loyalty_transactions'
          ) THEN
            ALTER TABLE loyalty_transactions ADD CONSTRAINT transaction_type_check
            CHECK (type IN ('EARNING', 'REDEMPTION', 'EXPIRATION', 'ADJUSTMENT'));
          END IF;
        END $$;
      `);

      // Create the unique composite index on loyalty_transactions if it doesn't exist
      // This matches the @Index decorator in the entity: [customerId, sourceType, sourceId, type] WHERE source_id IS NOT NULL
      await AppDataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'loyalty_transactions' AND indexname = 'idx_loyalty_transactions_customer_source'
          ) THEN
            CREATE UNIQUE INDEX idx_loyalty_transactions_customer_source
            ON loyalty_transactions (customer_id, source_type, source_id, type)
            WHERE source_id IS NOT NULL;
          END IF;
        END $$;
      `);
      logger.info('db.loyaltySchemaVerified');
    } catch (schemaError) {
      // Table may not exist yet (first run) - that's OK, TypeORM will create it
      logger.warn('db.loyaltySchemaNotCreatedYet', { error: String(schemaError) });
    }

    // Verify SMTP connection
    try {
      await verifySmtpConnection();
      logger.info('smtp.connected');
    } catch (error) {
      logger.error('smtp.connectionFailed', { error: String(error) });
    }

    // Verify Redis connection
    try {
      await verifyRedisConnection();
      logger.info('redis.connected');
    } catch (error) {
      logger.error('redis.connectionFailed', { error: String(error) });
    }

    // Find available port and start server
    const port = await findFreePort(basePort);
    server.listen(port, '0.0.0.0', () => {
      logger.info('server.listening', { port, instance: getInstanceId() });
    });

    // Register cleanup handlers to run during graceful shutdown.
    // Order matters: workers first, then Redis, then database pool last.
if (envConfig.ENABLE_WORKERS && emailWorker !== null) {
      const worker = emailWorker;
      onShutdown(async () => {
        logger.info('shutdown.worker.stopping', { worker: 'email' });
        await worker.close();
      });
    }

    // Close Redis connection.
    onShutdown(async () => {
      logger.info('shutdown.redis.closing');
      try {
        await redisClient.quit();
      } catch (_error) {
        // Ignore quit errors during shutdown.
      }
    });

    // Close database connection pool last.
    onShutdown(async () => {
      logger.info('shutdown.db.closing');
      try {
        await AppDataSource.destroy();
      } catch (error) {
        logger.warn('shutdown.db.closeError', { error: String(error) });
      }
    });

    // Register SIGTERM / SIGINT handlers that flip readiness off, drain active
    // requests, close workers/Redis/DB, then exit.
    registerSignalHandlers(server);

    // Handle uncaught exceptions (log but don't crash).
    process.on('uncaughtException', (error: Error) => {
      logger.error('error.uncaughtException', { error: String(error) });
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('error.unhandledRejection', { reason: String(reason) });
    });

  } catch (err: unknown) {
    logger.error('error.bootstrap', { error: String(err) });
    process.exit(1);
  }
};

void bootstrap();
