import { CorsOptions } from 'cors';

const PUBLIC_ORIGINS = [
  'https://bitebrewdashboard.netlify.app',
  'https://bitebrew.netlify.app',
];

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3004',
  'http://127.0.0.1:3000',
];

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, '');

const parseOriginList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
};

const isProduction = process.env.NODE_ENV === 'production';

const configuredOrigins = [
  ...parseOriginList(process.env.CORS_ORIGINS),
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN,
  process.env.CLIENT_URL,
]
  .filter((origin): origin is string => Boolean(origin && origin.trim().length > 0))
  .map(normalizeOrigin);

const allowedOrigins = new Set<string>([
  ...PUBLIC_ORIGINS.map(normalizeOrigin),
  ...configuredOrigins,
  ...(isProduction ? [] : DEFAULT_DEV_ORIGINS),
]);

export const isAllowedOrigin = (origin?: string | string[]): boolean => {
  const requestOrigin = Array.isArray(origin) ? origin[0] : origin;

  if (!requestOrigin) {
    return true;
  }

  return allowedOrigins.has(normalizeOrigin(requestOrigin));
};

const originHandler: CorsOptions['origin'] = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Origin not allowed by CORS'));
};

export const corsOptions: CorsOptions = {
  origin: originHandler,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

export const socketCorsOptions = {
  origin: originHandler,
  credentials: true,
  methods: ['GET', 'POST'],
};

export const resolvedCorsOrigins = Array.from(allowedOrigins);
