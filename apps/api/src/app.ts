import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { type DatabaseHealth } from './db.js';
import { requestContext } from './middleware/request-context.js';
import { createReadinessHandler, healthHandler } from './routes/system.js';
import { createV1Router } from './routes/v1.js';
import { createAiRouter } from './routes/ai.js';
import { errorHandler, notFoundHandler } from './shared/errors.js';

export interface AppDependencies {
  config: AppConfig;
  database: DatabaseHealth;
}

export function createApp({ config, database }: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use((request, _response, next) => {
    logger.info({ requestId: request.requestId, method: request.method, path: request.path }, 'Incoming request');
    next();
  });
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], credentials: false }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', healthHandler);
  app.get('/api/ready', createReadinessHandler(database));
  app.use('/api/v1', createV1Router(config));
  app.use('/ai', createAiRouter(config));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
