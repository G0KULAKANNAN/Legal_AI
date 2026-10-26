import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../config/logger';

const subscriptionService = new SubscriptionService();

export class SubscriptionController {
  async getPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = subscriptionService.getPublicPlans();
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getUserSubscription(req.user!.id);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async createCheckout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = req.body.plan || 'PREMIUM';
      const order = await subscriptionService.createCheckoutOrder(req.user!.id, plan);
      return sendSuccess(res, order, 'Payment order created');
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { orderId, paymentId, signature } = req.body;
      const result = await subscriptionService.verifyAndActivatePayment(req.user!.id, {
        orderId,
        paymentId,
        signature,
      });
      return sendSuccess(res, result.subscription, result.message);
    } catch (err) {
      next(err);
    }
  }

  async cancelSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionService.cancelSubscription(req.user!.id);
      return sendSuccess(res, result.subscription, result.message);
    } catch (err) {
      next(err);
    }
  }

  async contactEnterprise(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, company, phone, expectedUsers, notes } = req.body;
      const result = await subscriptionService.submitEnterpriseInquiry({
        userId: req.user?.id,
        name,
        email,
        company,
        phone,
        expectedUsers,
        notes,
      });
      return sendSuccess(res, { leadId: result.leadId }, result.message);
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
      const webhookSecret = config.subscription.razorpay.webhookSecret;
      const signature = req.headers['x-razorpay-signature'] as string;

      if (signature && webhookSecret) {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSignature) {
          logger.warn('[SubscriptionWebhook] Invalid Razorpay webhook signature');
          return res.status(400).json({ status: 'invalid_signature' });
        }
      }

      logger.info(`[SubscriptionWebhook] Received event: ${req.body.event}`);
      // Return 200 OK to acknowledge webhook
      return res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      logger.error(`[SubscriptionWebhook] Webhook error: ${err.message}`);
      return res.status(200).json({ status: 'error_logged' });
    }
  }
}
