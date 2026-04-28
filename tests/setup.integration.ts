process.env.NODE_ENV = 'test';
process.env.RUN_MIGRATIONS = 'false';
process.env.DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@localhost:5432/bitebrew';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
