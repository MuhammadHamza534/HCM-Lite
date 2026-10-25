import { PrismaClient } from '@prisma/client';
import { logger } from './config/logger.js';

export interface DatabaseHealth {
  checkConnection(): Promise<void>;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const database: DatabaseHealth = {
  async checkConnection(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }
};

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect().catch((error: unknown) => logger.warn({ err: error }, 'Database disconnect failed'));
}
