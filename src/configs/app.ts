import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import  { rateLimit } from '../middleware/rateLimit.middleware';
import { autoUserTracking } from '../middleware/autoUserTracking.middleware';
import { responseNormalize } from "../middleware/responseNormalize.middleware";
import indexRouter from "../routes/index.route";
import { httpLogger } from "../utils/logger";
import { corsOptions } from './cors.config';

const createApp = () => {
  const app = express();

  // Middleware stack as per flow

  // CORS
  app.use(cors(corsOptions));


  // Cookies
  app.use(cookieParser());

  // JSON body parser
  app.use(express.json({ limit: '10mb' }));

  // URL encoded parser
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Client hints (helmet)
  app.use(helmet());
  app.use(httpLogger);
  app.use(responseNormalize);

  // Auto tracking
  app.use(autoUserTracking);


  // Rate limiting
  app.use(rateLimit);


  // API base path /api/v1/bite-brew
  app.use('/api/v1/bite-brew', indexRouter);

  // Create HTTP server (don't listen)
  const server = require('http').createServer(app);

  return { app, server };
};

export { createApp };

