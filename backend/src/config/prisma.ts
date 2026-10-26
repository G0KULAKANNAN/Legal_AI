import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  // Optional query logging
  // (prisma as any).$on('query', (e: any) => {
  //   logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
  // });
}
