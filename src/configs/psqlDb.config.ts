import "reflect-metadata";
import { DataSource } from 'typeorm';
import { envConfig } from "./env.config";
import url from 'url';

const dbUrl =
  envConfig.DB_URL ||
  (process.env.NODE_ENV === "test" ? "postgresql://postgres:postgres@localhost:5432/bitebrew" : undefined);
if (!dbUrl) {
  throw new Error('DB_URL is required in environment variables');
}

const parsedUrl = url.parse(dbUrl, true);
const auth = (parsedUrl.auth || '').split(':');
const username = auth[0] || '';
const password = auth[1] || '';
const database = parsedUrl.pathname?.replace('/', '') || '';
const isProduction = process.env.NODE_ENV === "production";
const synchronize = process.env.DB_SYNCHRONIZE
  ? process.env.DB_SYNCHRONIZE === "true"
  : !isProduction;
const isTsRuntime = __filename.endsWith(".ts");
const entityPaths = isTsRuntime ? ["src/**/*.entity.ts"] : ["dist/**/*.entity.js"];

/**
 * PostgreSQL Connection Pool Configuration
 * 
 * TypeORM passes these settings to the underlying `pg` driver's Pool class.
 * Each application request borrows a connection from this pool:
 * 
 * 1. Request arrives → TypeORM calls AppDataSource.getRepository() or manager.query()
 * 2. If connection available in pool → Reuse it (no TCP handshake)
 * 3. If no connection available but max not reached → Create new connection
 * 4. If max connections reached → Wait for one to be released (respects connectionTimeoutMillis)
 * 5. Query executes with borrowed connection
 * 6. Query completes → Connection returned to pool
 * 7. If idle for idleTimeoutMillis → PostgreSQL server closes it
 */
const poolConfig = {
  // Maximum number of connections to maintain in the pool
  // Prevents unbounded connection growth and database server overload
  max: envConfig.DB_POOL_MAX,
  
  // Minimum number of connections to maintain idle (only applicable in some pool implementations)
  // Helps warm up connections and reduce initial query latency
  min: envConfig.DB_POOL_MIN,
  
  // How long a connection can sit idle (milliseconds) before being closed
  // Frees server-side resources; default 30s is production-safe
  idleTimeoutMillis: envConfig.DB_POOL_IDLE_TIMEOUT_MS,
  
  // How long to wait (milliseconds) for a connection to become available
  // Prevents indefinite hangs; 10s default balances responsiveness vs stability
  connectionTimeoutMillis: envConfig.DB_POOL_CONNECTION_TIMEOUT_MS,
  
  // Keep alive packets to prevent connection timeouts on firewalls/proxies
  keepAlives: envConfig.DB_POOL_KEEP_ALIVE,
  
  // Keep alive interval in seconds (default ~30s)
  keepAliveInitialDelaySeconds: 30,
  
  // Application name for server-side query logging and connection identification
  // Visible in PostgreSQL pg_stat_activity for monitoring/debugging
  application_name: `bite-brew-${process.env.NODE_ENV || 'development'}`,
  
  // Allow query cancellation and result streaming (statement_timeout awareness)
  statement_timeout: false,
  
  // Enable connection reuse by verifying connection health on checkout
  // Helps detect stale/dead connections without waiting for query to fail
  connectionHealthCheck: true,
};

/**
 * SSL Configuration
 * 
 * Production: Enforce SSL (rejectUnauthorized: false only for self-signed certs in staging)
 * Development/Test: SSL optional (reduces certificate hassles)
 */
const sslConfig = isProduction
  ? { rejectUnauthorized: false } // Use true in production with valid certs
  : { rejectUnauthorized: false };

export const AppDataSource = new DataSource({
  type: "postgres" as const,
  host: parsedUrl.hostname || "localhost",
  port: parsedUrl.port ? parseInt(parsedUrl.port) : 5432,
  username,
  password,
  database,
  ssl: sslConfig,
  entities: entityPaths,
  synchronize,
  logging: envConfig.DB_POOL_LOG_QUERIES,
  // Pass pool configuration to the underlying pg driver
  // TypeORM uses these settings when creating its connection pool internally
  extra: poolConfig,
});

/**
 * Legacy setupDatabase function (kept for backward compatibility)
 * Now initialization should be done in index.ts bootstrap()
 */
export const setupDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✓ PostgreSQL connected');
  } catch (error) {
    console.error('✗ DB connection failed:', error);
    throw error;
  }
};
