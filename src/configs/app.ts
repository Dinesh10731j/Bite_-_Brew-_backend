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
import { Message } from '../constant/message.interface';

import http from "http";
import { setupSocket } from "./socket.config";

const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

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
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Log the error for debugging
    if (err?.stack) {
      console.error('[GlobalErrorHandler]', err);
    } else {
      console.error('[GlobalErrorHandler]', err?.message || err || 'Unknown error');
    }

    // Handle known error shapes
    const statusCode =
      err?.statusCode && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : err?.status
          ? Number(err.status)
          : 500;

    const message = err?.message || Message.INTERNAL_SERVER_ERROR;

    res.status(statusCode).json({ message });
  });

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metricsContentType);
    res.status(200).send(await getMetrics());
  });
  app.get('/livez', (_req, res) => res.status(200).json({ status: 'live' }));
  app.get('/readyz', (_req, res) => res.status(200).json({ status: 'ready' }));

  // Create HTTP server (don't listen)
  const server = http.createServer(app);


  const io = setupSocket(server);

  return { app, server, io };
};

export { createApp };
