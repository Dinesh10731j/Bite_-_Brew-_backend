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

export const AppDataSource = new DataSource({
  type: "postgres" as const,
  host: parsedUrl.hostname || "localhost",
  port: parsedUrl.port ? parseInt(parsedUrl.port) : 5432,
  username,
  password,
  database,
  ssl: { rejectUnauthorized: false },
  entities: entityPaths,
  synchronize,
  logging: false,
});

export const setupDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('PostgreSQL connected');
  } catch (error) {
    console.error('DB connection failed:', error);
  }
};
