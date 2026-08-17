import { cleanEnv, parseToBoolean, parseToInt, cleanPass } from '../utils/env.utils';

import { config } from 'dotenv';
if (process.env.NODE_ENV !== 'test') {
  config();
}

export const envConfig = {
  PORT: cleanEnv(process.env.PORT),
  // ===== Instance / Deployment Identity =====
  // Unique identifier for this API instance (e.g. "api-01").
  // If not provided, a safe identifier is generated (see instance.config.ts).
  INSTANCE_ID: cleanEnv(process.env.INSTANCE_ID),
  // Number of trusted proxy hops in front of this API (load balancer / reverse proxy).
  // Controls Express `trust proxy` and safe client-IP resolution.
  TRUST_PROXY_HOPS: parseToInt(process.env.TRUST_PROXY_HOPS, 1),
  // Whether BullMQ/background workers should run in this replicas.
  // Set to "false" on replicas that should be API-only.
  ENABLE_WORKERS: parseToBoolean(process.env.ENABLE_WORKERS, true),
  // Graceful shutdown hard timeout (ms) before force-exit.
  SHUTDOWN_TIMEOUT_MS: parseToInt(process.env.SHUTDOWN_TIMEOUT_MS, 30000),
  DB_PASSWORD: cleanEnv(process.env.DB_PASSWORD),
  DB_URL: cleanEnv(process.env.DATABASE_URL) ?? cleanEnv(process.env.DB_URL),
  DB_HOST: cleanEnv(process.env.DB_HOST),
  DB_TYPE: cleanEnv(process.env.DB_TYPE),
  DB_NAME: cleanEnv(process.env.DB_NAME),
  DB_USER_NAME: cleanEnv(process.env.DB_USER_NAME),
  // PostgreSQL Connection Pool Configuration
  DB_POOL_MAX: parseToInt(process.env.DB_POOL_MAX, process.env.NODE_ENV === 'production' ? 20 : 10),
  DB_POOL_MIN: parseToInt(process.env.DB_POOL_MIN, process.env.NODE_ENV === 'production' ? 5 : 2),
  DB_POOL_IDLE_TIMEOUT_MS: parseToInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
  DB_POOL_CONNECTION_TIMEOUT_MS: parseToInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10000),
  DB_POOL_KEEP_ALIVE: parseToBoolean(process.env.DB_POOL_KEEP_ALIVE, true),
  DB_POOL_LOG_QUERIES: parseToBoolean(process.env.DB_POOL_LOG_QUERIES, false),
  // End of pool configuration
  JWT_SECRET_TOKEN: cleanEnv(process.env.JWT_SECRET_TOKEN),
  ACCESS_TOKEN_SECRET: cleanEnv(process.env.ACCESS_TOKEN_SECRET),
  REFRESH_TOKEN_SECRET: cleanEnv(process.env.REFRESH_TOKEN_SECRET),
  REDIS_URL: cleanEnv(process.env.REDIS_URL),
  REDIS_HOST: cleanEnv(process.env.REDIS_HOST),
  REDIS_PORT: parseToInt(process.env.REDIS_PORT, 6379),
  SMTP_HOST: cleanEnv(process.env.SMTP_HOST),
  SMTP_PORT: cleanEnv(process.env.SMTP_PORT),
  SMTP_USER: cleanEnv(process.env.SMTP_USER),
  SMTP_PASS: cleanPass(process.env.SMTP_PASS),
  CLOUDINARY_CLOUD_NAME: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: cleanEnv(process.env.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: cleanEnv(process.env.CLOUDINARY_API_SECRET),
  FRONTEND_URL: cleanEnv(process.env.FRONTEND_ORIGIN),
  RECAPTCHA_SECRET_KEY: cleanEnv(process.env.RECAPTCHA_SECRET_KEY),
  CORS_ORIGINS: cleanEnv(process.env.CORS_ORIGINS),
  // ===== Security / Session Configuration =====
  // Access token lifetime (default 15 minutes)
  JWT_ACCESS_EXPIRES_IN: cleanEnv(process.env.JWT_ACCESS_EXPIRES_IN) || '15m',
  // Refresh token lifetime (default 30 days)
  JWT_REFRESH_EXPIRES_IN: cleanEnv(process.env.JWT_REFRESH_EXPIRES_IN) || '30d',
  // Redis session TTL (seconds). Must be >= refresh token lifetime.
  SESSION_TTL_SECONDS: parseToInt(process.env.SESSION_TTL_SECONDS, 30 * 24 * 60 * 60),
  // Whether a user may have only one active session (Netflix-style single active session)
  SINGLE_ACTIVE_SESSION: parseToBoolean(process.env.SINGLE_ACTIVE_SESSION, true),
  // Whether to enforce device fingerprint matching on every request
  DEVICE_FINGERPRINT_ENFORCED: parseToBoolean(process.env.DEVICE_FINGERPRINT_ENFORCED, true),
  // Whether IP anomaly detection is enabled during session validation
  IP_ANOMALY_ENFORCED: parseToBoolean(process.env.IP_ANOMALY_ENFORCED, false),
  // Whether email verification is required before first login
  EMAIL_VERIFICATION_REQUIRED: parseToBoolean(process.env.EMAIL_VERIFICATION_REQUIRED, false),
  // Idle session timeout (seconds) - sessions idle longer than this are invalidated
  IDLE_SESSION_TIMEOUT_SECONDS: parseToInt(
    process.env.IDLE_SESSION_TIMEOUT_SECONDS,
    2 * 24 * 60 * 60,
  ),
  // ===== Account Protection =====
  // Max failed login attempts before temporary lock
  MAX_FAILED_LOGIN_ATTEMPTS: parseToInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 5),
  // Lockout duration (seconds) after exceeding failed attempts
  ACCOUNT_LOCK_DURATION_SECONDS: parseToInt(process.env.ACCOUNT_LOCK_DURATION_SECONDS, 15 * 60),
  // ===== Registration Anti-Abuse =====
  // Max registrations per IP within the window
  MAX_REGISTRATIONS_PER_IP: parseToInt(process.env.MAX_REGISTRATIONS_PER_IP, 5),
  // Max registrations per device hash within the window
  MAX_REGISTRATIONS_PER_DEVICE: parseToInt(process.env.MAX_REGISTRATIONS_PER_DEVICE, 3),
  // Registration window (seconds)
  REGISTRATION_WINDOW_SECONDS: parseToInt(process.env.REGISTRATION_WINDOW_SECONDS, 24 * 60 * 60),
  // ===== Rate Limiting =====
  RATE_LIMIT_LOGIN_POINTS: parseToInt(process.env.RATE_LIMIT_LOGIN_POINTS, 10),
  RATE_LIMIT_LOGIN_DURATION: parseToInt(process.env.RATE_LIMIT_LOGIN_DURATION, 60),
  RATE_LIMIT_REGISTRATION_POINTS: parseToInt(process.env.RATE_LIMIT_REGISTRATION_POINTS, 5),
  RATE_LIMIT_REGISTRATION_DURATION: parseToInt(process.env.RATE_LIMIT_REGISTRATION_DURATION, 3600),
  RATE_LIMIT_REFRESH_POINTS: parseToInt(process.env.RATE_LIMIT_REFRESH_POINTS, 30),
  RATE_LIMIT_REFRESH_DURATION: parseToInt(process.env.RATE_LIMIT_REFRESH_DURATION, 60),
  // ===== Security Auditing =====
  // Whether login history and security event persistence is enabled
  SECURITY_AUDIT_ENABLED: parseToBoolean(process.env.SECURITY_AUDIT_ENABLED, true),
};

Object.freeze(envConfig);
