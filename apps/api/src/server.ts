import './config/load-root-env.js';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { database, disconnectDatabase } from './db.js';

const config = loadConfig();
const app = createApp({ config, database });
const server = app.listen(config.PORT, () => logger.info({ port: config.PORT }, 'API listening'));

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down API');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
