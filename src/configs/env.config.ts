import { config } from "dotenv";
config();

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

export const envConfig = {
  PORT: cleanEnv(process.env.PORT),
  DB_PASSWORD: cleanEnv(process.env.DB_PASSWORD),
 DB_URL: cleanEnv(process.env.DATABASE_URL),
  DB_HOST: cleanEnv(process.env.DB_HOST),
  DB_TYPE: cleanEnv(process.env.DB_TYPE),
  DB_NAME: cleanEnv(process.env.DB_NAME),
  DB_USER_NAME: cleanEnv(process.env.DB_USER_NAME),
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
