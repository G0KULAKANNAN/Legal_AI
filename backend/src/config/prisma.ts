import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prevent multiple PrismaClient instances in serverless / hot-reloading environments
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
  });

// Retain instance across warm invocations in serverless environments
globalForPrisma.prisma = prisma;
