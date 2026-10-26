import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/prisma';

export class UserController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          preferredLanguage: true,
          isEmailVerified: true,
          createdAt: true,
          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
              amount: true,
              currency: true,
              billingCycle: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              documentsAnalyzedThisMonth: true,
            },
          },
        },
      });
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, preferredLanguage } = req.body;
      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name ? { name } : {}),
          ...(preferredLanguage ? { preferredLanguage } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          preferredLanguage: true,
        },
      });
      return sendSuccess(res, updated, 'Profile updated');
    } catch (err) {
      next(err);
    }
  }
}
