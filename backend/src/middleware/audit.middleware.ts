import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export function logAuditAction(action: string, resource: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              action,
              resource,
              ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
              details: {
                method: req.method,
                path: req.originalUrl,
                params: req.params,
                query: req.query,
                statusCode: res.statusCode,
              },
            },
          });
        } catch (err: any) {
          logger.error(`Failed to record audit log: ${err.message}`);
        }
      }
    });
    next();
  };
}
