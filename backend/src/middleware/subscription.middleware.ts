import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { logger } from '../config/logger';

export interface SubscriptionRequest extends AuthenticatedRequest {
  subscription?: any;
}

export async function requireActiveSubscription(
  req: SubscriptionRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedError('Authentication required to access protected legal analysis features');
    }

    // Admins bypass subscription restrictions
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const userId = req.user.id;
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new ForbiddenError(
        'Subscription required: You must purchase the Premium plan (₹299/month) or be granted an Enterprise subscription to analyze documents and access LegalAI features.',
        {
          code: 'SUBSCRIPTION_REQUIRED',
          planRequired: 'PREMIUM',
          pricingUrl: '/pricing',
        }
      );
    }

    const now = new Date();

    // Check expiration
    if (subscription.currentPeriodEnd < now) {
      if (subscription.status !== 'EXPIRED') {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new ForbiddenError(
        `Your subscription expired on ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}. Please renew your Premium subscription to continue analyzing documents.`,
        {
          code: 'SUBSCRIPTION_EXPIRED',
          expiredAt: subscription.currentPeriodEnd,
          pricingUrl: '/pricing',
        }
      );
    }

    // Check active status
    if (subscription.status !== 'ACTIVE') {
      throw new ForbiddenError(
        `Your subscription is currently ${subscription.status.toLowerCase()}. Please reactivate your Premium subscription to access LegalAI features.`,
        {
          code: 'SUBSCRIPTION_INACTIVE',
          status: subscription.status,
          pricingUrl: '/pricing',
        }
      );
    }

    // Check monthly reset window (30 days from lastUsageReset)
    const resetIntervalMs = 30 * 24 * 60 * 60 * 1000;
    if (now.getTime() - subscription.lastUsageReset.getTime() > resetIntervalMs) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          documentsAnalyzedThisMonth: 0,
          lastUsageReset: now,
        },
      });
      subscription.documentsAnalyzedThisMonth = 0;
    }

    // Check document limit
    const planConfig = config.subscription.plans[subscription.plan as keyof typeof config.subscription.plans];
    const monthlyLimit = planConfig ? planConfig.documentLimitPerMonth : 50;

    if (subscription.documentsAnalyzedThisMonth >= monthlyLimit) {
      logger.warn(`[Subscription] User ${userId} reached monthly document limit (${subscription.documentsAnalyzedThisMonth}/${monthlyLimit})`);
      throw new ForbiddenError(
        `Monthly document analysis limit (${monthlyLimit} documents) reached for this billing cycle. Your limit resets on ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}. Contact Sales for an Enterprise subscription if you need higher limits.`,
        {
          code: 'USAGE_LIMIT_EXCEEDED',
          used: subscription.documentsAnalyzedThisMonth,
          limit: monthlyLimit,
          resetDate: subscription.currentPeriodEnd,
        }
      );
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    next(err);
  }
}
