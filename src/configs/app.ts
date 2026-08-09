import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from '../middleware/rateLimit.middleware';
import { autoUserTracking } from '../middleware/autoUserTracking.middleware';
import { responseNormalize } from "../middleware/responseNormalize.middleware";
import indexRouter from "../routes/index.route";
import { httpLogger } from "../utils/logger";
import { corsOptions } from './cors.config';
import { helmetOptions } from './helmet.config';
import { getMetrics, metricsContentType, recordHttpRequest } from '../observability/metrics';
import { requestContextMiddleware } from '../observability/context';
import { errorHandler } from "../middleware/errorHandler.middleware";
import { healthHandler, readinessHandler } from '../middleware/health.middleware';
import { requestLogMiddleware } from '../middleware/requestLog.middleware';
import { envConfig } from './env.config';
import { getInstanceId } from './instance.config';
import { logger } from '../infrastructure/logger';

import http from "http";
import { setupSocket } from "./socket.config";

const createApp = () => {
  const app = express();

  // Trust proxy based on the number of trusted hops in front of this API.
  // Defaults to 1 (one load balancer / reverse proxy). Set to 0 to disable.
  app.set('trust proxy', envConfig.TRUST_PROXY_HOPS);

  // Middleware stack as per flow

  // CORS
  app.use(cors(corsOptions));


  // Cookies
  app.use(cookieParser());

  // JSON body parser
  app.use(express.json({ limit: '10mb' }));

  // URL encoded parser
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(helmet(helmetOptions));
  app.use(httpLogger);
  // Structured JSON request logging (requestId, instanceId, method, route, status, duration).
  app.use(requestLogMiddleware);
  app.use(responseNormalize);

  // Rate limiting should run before heavier tracking middleware.
  app.use(rateLimit);

  // Request correlation + tracing context (MUST be early).
  app.use(requestContextMiddleware);

  // Performance breakdown tracing (after request correlation so trace/requestId are available).
  const { perfRequestMiddleware } = require('../perf/perfMiddleware');
  app.use(perfRequestMiddleware);

  // Auto tracking
  app.use(autoUserTracking);
  // Request metrics wrapper (measure total latency + bytes).
  // NOTE: must be before routes to cover entire lifecycle.
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const bytesIn =
      typeof req.headers['content-length'] === 'string'
        ? Number(req.headers['content-length'])
        : undefined;

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const bytesOut =
        typeof res.getHeader === 'function'
          ? (Number(res.getHeader('content-length') as any) || undefined)
          : undefined;

      recordHttpRequest({
        req: req as any,
        resStatusCode: res.statusCode,
        durationMs,
        bytesIn,
        bytesOut,
      });
    });

    next();
  });

  // API base path /api/v1/bite-brew
  app.use('/api/v1/bite-brew', indexRouter);

// Global Express error-handling middleware (must be 4 args for Express to recognize it)
  app.use(errorHandler);

// Health probes - must be registered BEFORE the API routes and error handler
  // so they are always reachable, even if other middleware fails.
  app.get('/health', healthHandler);
  app.get('/ready', readinessHandler);

  // Prometheus metrics endpoint.
  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metricsContentType);
    res.status(200).send(await getMetrics());
  });

  // Backward-compatible Kubernetes aliases.
  app.get('/livez', healthHandler);
  app.get('/readyz', readinessHandler);

  // Create HTTP server (don't listen)
  const server = http.createServer(app);


  const io = setupSocket(server);

  return { app, server, io };
};

export { createApp };
