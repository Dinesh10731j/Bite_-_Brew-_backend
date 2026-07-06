import { config } from "dotenv";
if (process.env.NODE_ENV !== "test") {
  config();
}

const cleanEnv = (value?: string): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const cleanPass = (value?: string): string | undefined => {
  const cleaned = cleanEnv(value);
  return cleaned ? cleaned.replace(/\s+/g, "") : cleaned;
};

const parseToInt = (value?: string, defaultValue: number = 0): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseToBoolean = (value?: string, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === "true" || value === "1";
};

export const envConfig = {
  PORT: cleanEnv(process.env.PORT),
  DB_PASSWORD: cleanEnv(process.env.DB_PASSWORD),
  DB_URL: cleanEnv(process.env.DATABASE_URL) ?? cleanEnv(process.env.DB_URL),
  DB_HOST: cleanEnv(process.env.DB_HOST),
  DB_TYPE: cleanEnv(process.env.DB_TYPE),
  DB_NAME: cleanEnv(process.env.DB_NAME),
  DB_USER_NAME: cleanEnv(process.env.DB_USER_NAME),
  // PostgreSQL Connection Pool Configuration
  DB_POOL_MAX: parseToInt(
    process.env.DB_POOL_MAX,
    process.env.NODE_ENV === "production" ? 20 : 10
  ),
  DB_POOL_MIN: parseToInt(
    process.env.DB_POOL_MIN,
    process.env.NODE_ENV === "production" ? 5 : 2
  ),
  DB_POOL_IDLE_TIMEOUT_MS: parseToInt(
    process.env.DB_POOL_IDLE_TIMEOUT_MS,
    30000
  ),
  DB_POOL_CONNECTION_TIMEOUT_MS: parseToInt(
    process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
    10000
  ),
  DB_POOL_KEEP_ALIVE: parseToBoolean(process.env.DB_POOL_KEEP_ALIVE, true),
  DB_POOL_LOG_QUERIES: parseToBoolean(process.env.DB_POOL_LOG_QUERIES, false),
  // End of pool configuration
  JWT_SECRET_TOKEN: cleanEnv(process.env.JWT_SECRET_TOKEN),
  ACCESS_TOKEN_SECRET: cleanEnv(process.env.ACCESS_TOKEN_SECRET),
  REFRESH_TOKEN_SECRET: cleanEnv(process.env.REFRESH_TOKEN_SECRET),
  REDIS_URL: cleanEnv(process.env.REDIS_URL),
  SMTP_HOST: cleanEnv(process.env.SMTP_HOST),
  SMTP_PORT: cleanEnv(process.env.SMTP_PORT),
  SMTP_USER: cleanEnv(process.env.SMTP_USER),
  SMTP_PASS: cleanPass(process.env.SMTP_PASS),
  CLOUDINARY_CLOUD_NAME: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: cleanEnv(process.env.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: cleanEnv(process.env.CLOUDINARY_API_SECRET),
  FRONTEND_URL: cleanEnv(process.env.FRONTEND_URL),
  RECAPTCHA_SECRET_KEY: cleanEnv(process.env.RECAPTCHA_SECRET_KEY),
  CORS_ORIGINS: cleanEnv(process.env.CORS_ORIGINS),
};



Object.freeze(envConfig)
