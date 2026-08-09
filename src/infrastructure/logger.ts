import { getInstanceId } from '../configs/instance.config';

/**
 * Types of structured log entries.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Base fields common to every log entry.
 */
export interface LogFields {
  requestId?: string;
  instanceId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Structured JSON logger.
 *
 * Every entry includes `instanceId` and, when provided, `requestId`, `method`,
 * `route`, `statusCode`, and `durationMs`. Sensitive values (passwords, tokens,
 * cookies, authorization headers, connection strings) must NEVER be passed in
 * `fields`.
 *
 * Output is a single JSON object per line, which is machine-readable and
 * suitable for ingestion by log aggregation / observability tools.
 */
const write = (level: LogLevel, message: string, fields: LogFields = {}): void => {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    instanceId: getInstanceId(),
    message,
    ...fields,
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
};

export const logger = {
  debug: (message: string, fields?: LogFields): void => write('debug', message, fields),
  info: (message: string, fields?: LogFields): void => write('info', message, fields),
  warn: (message: string, fields?: LogFields): void => write('warn', message, fields),
  error: (message: string, fields?: LogFields): void => write('error', message, fields),
};

/**
 * Convenience: build the standard request-scoped log fields.
 */
export const requestLogFields = (req: {
  requestId?: string;
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
}): LogFields => ({
  requestId: req.requestId,
  method: req.method,
  route: req.route?.path || req.originalUrl,
});
