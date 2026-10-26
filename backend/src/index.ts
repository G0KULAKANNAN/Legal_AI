process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import app from './app';
import { config } from './config';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { reminderWorker } from './workers/reminder.worker';

const server = app.listen(config.port, () => {
  logger.info(`===================================================`);
  logger.info(` LegalAI Backend Service running on port ${config.port}`);
  logger.info(` Environment: ${config.nodeEnv}`);
  logger.info(` Database URL: ${config.databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  logger.info(` Gemini Model: ${config.gemini.model}`);
  logger.info(` Tagline: "Do Not Sign Before Reviewing the Document"`);
  logger.info(`===================================================`);

  // Start automated legal deadline reminder worker
  reminderWorker.start();
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  reminderWorker.stop();
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
