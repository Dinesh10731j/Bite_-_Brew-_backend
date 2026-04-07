import 'reflect-metadata';
import { createApp } from './configs/app';
import { AppDataSource } from './configs/psqlDb.config';
import { envConfig } from './configs/env.config';
import { verifySmtpConnection } from './configs/smtp.config';
import { redisClient, verifyRedisConnection } from './configs/redis.config';

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

const bootstrap = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    if (process.env.NODE_ENV !== 'test' && process.env.RUN_MIGRATIONS !== 'false') {
      const migrations = await AppDataSource.runMigrations();
      console.log(`Migrations applied (${migrations.length})`);
    } else {
      console.log('Migrations skipped');
    }

    try {
      await verifySmtpConnection();
      console.log('SMTP connected successfully');
    } catch (error) {
      console.error('SMTP connection failed', error);
    }

    try {
      await verifyRedisConnection();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Redis connection failed', error);
    }

    const port = await findFreePort(basePort);
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server PID: ${process.pid}`);
      console.log(`Server running on http://localhost:${port}`);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('Server closed.');
        try {
          await redisClient.quit();
        } catch (_error) {
          // ignore quit errors during shutdown
        }
        await AppDataSource.destroy();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err: unknown) {
    console.error('Database connection failed', err);
  }
};

void bootstrap();
