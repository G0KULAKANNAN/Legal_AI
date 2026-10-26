import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { logger } from '../config/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export class SubscriptionService {
  private razorpayInstance: Razorpay | null = null;
  private isSandbox: boolean = true;

  constructor() {
    const keyId = config.subscription.razorpay.keyId;
    const keySecret = config.subscription.razorpay.keySecret;

    // Detect if running with real Razorpay credentials or sandbox mode
    if (keyId && keySecret && !keyId.includes('sandbox') && !keyId.includes('placeholder')) {
      try {
        this.razorpayInstance = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
        this.isSandbox = false;
        logger.info('[SubscriptionService] Initialized with Live/Test Razorpay Gateway');
      } catch (err: any) {
        logger.warn(`[SubscriptionService] Razorpay init failed: ${err.message}. Falling back to Sandbox mode.`);
        this.isSandbox = true;
      }
    } else {
      this.isSandbox = true;
      logger.info('[SubscriptionService] Running in labeled Sandbox Mode for Razorpay integration');
    }
  }

  getPublicPlans() {
    return {
      plans: [
        {
          id: config.subscription.plans.PREMIUM.id,
          name: config.subscription.plans.PREMIUM.name,
          price: config.subscription.plans.PREMIUM.priceMonthlyInInr,
          priceFormatted: '₹299',
          period: 'month',
          currency: config.subscription.plans.PREMIUM.currency,
          documentLimit: config.subscription.plans.PREMIUM.documentLimitPerMonth,
          features: config.subscription.plans.PREMIUM.features,
          isRecommended: true,
          ctaText: 'Subscribe Now – ₹299/mo',
        },
        {
          id: config.subscription.plans.ENTERPRISE.id,
          name: config.subscription.plans.ENTERPRISE.name,
          price: 'Custom',
          priceFormatted: 'Custom Pricing',
          period: 'organization billing',
          currency: config.subscription.plans.ENTERPRISE.currency,
          documentLimit: config.subscription.plans.ENTERPRISE.documentLimitPerMonth,
          features: config.subscription.plans.ENTERPRISE.features,
          isRecommended: false,
          ctaText: 'Contact Sales',
        },
      ],
      gateway: {
        isSandbox: this.isSandbox,
        keyId: config.subscription.razorpay.keyId,
        currency: 'INR',
      },
    };
  }

  async getUserSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'ADMIN') {
      return {
        hasActiveSubscription: true,
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        isAdminBypass: true,
        usage: {
          used: 0,
          limit: 9999,
          resetsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
        subscription: {
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          amount: 0,
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    }

    const sub = user.subscription;
    if (!sub) {
      return {
        hasActiveSubscription: false,
        plan: null,
        status: 'NONE',
        usage: {
          used: 0,
          limit: 0,
          resetsAt: null,
        },
        subscription: null,
      };
    }

    const now = new Date();
    const isExpired = sub.currentPeriodEnd < now;
    const isActive = sub.status === 'ACTIVE' && !isExpired;

    if (isExpired && sub.status !== 'EXPIRED') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      sub.status = 'EXPIRED' as any;
    }

    const planConfig = config.subscription.plans[sub.plan as keyof typeof config.subscription.plans];
    const limit = planConfig ? planConfig.documentLimitPerMonth : 50;

    return {
      hasActiveSubscription: isActive,
      plan: sub.plan,
      status: sub.status,
      usage: {
        used: sub.documentsAnalyzedThisMonth,
        limit,
        resetsAt: sub.currentPeriodEnd.toISOString(),
      },
      subscription: {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        amount: sub.amount,
        amountFormatted: `₹${sub.amount / 100}`,
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
    };
  }

  async createCheckoutOrder(userId: string, plan: 'PREMIUM') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (plan !== 'PREMIUM') {
      throw new BadRequestError('Only the Premium subscription plan (₹299/month) is eligible for direct checkout. For Enterprise, please Contact Sales.');
    }

    const planDetails = config.subscription.plans.PREMIUM;
    const amount = planDetails.priceInPaise; // 29900 paise = ₹299
    const currency = 'INR';

    let orderId: string;

    if (!this.isSandbox && this.razorpayInstance) {
      try {
        const order = await this.razorpayInstance.orders.create({
          amount,
          currency,
          receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
          notes: {
            userId,
            plan: 'PREMIUM',
            userEmail: user.email,
          },
        });
        orderId = order.id;
      } catch (err: any) {
        logger.error(`[SubscriptionService] Razorpay order creation failed: ${err.message}`);
        throw new Error(`Payment gateway order creation failed: ${err.message}`);
      }
    } else {
      // Sandbox mode: generate a deterministic, cryptographically secure sandbox order ID
      orderId = `order_sandbox_${crypto.randomBytes(10).toString('hex')}`;
    }

    // Record pending transaction in database
    await prisma.paymentTransaction.create({
      data: {
        userId,
        orderId,
        amount,
        currency,
        status: 'CREATED',
        plan: SubscriptionPlan.PREMIUM,
      },
    });

    logger.info(`[SubscriptionService] Created payment order ${orderId} (₹299) for user ${userId} [Sandbox: ${this.isSandbox}]`);

    return {
      orderId,
      amount,
      currency,
      keyId: config.subscription.razorpay.keyId,
      plan: 'PREMIUM',
      planName: planDetails.name,
      user: {
        name: user.name,
        email: user.email,
      },
      isSandbox: this.isSandbox,
    };
  }

  async verifyAndActivatePayment(userId: string, data: { orderId: string; paymentId: string; signature: string }) {
    const { orderId, paymentId, signature } = data;

    if (!orderId || !paymentId || !signature) {
      throw new BadRequestError('Missing order ID, payment ID, or verification signature');
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { orderId },
    });

    if (!transaction || transaction.userId !== userId) {
      throw new BadRequestError('Payment order record not found or does not match authenticated user');
    }

    // Verify cryptographic signature
    let isSignatureValid = false;

    if (!this.isSandbox && this.razorpayInstance) {
      const generatedSignature = crypto
        .createHmac('sha256', config.subscription.razorpay.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      isSignatureValid = generatedSignature === signature;
    } else {
      // Sandbox signature verification
      const expectedSandboxSig = crypto
        .createHmac('sha256', config.subscription.razorpay.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      isSignatureValid = signature === expectedSandboxSig || signature.startsWith('sig_sandbox_') || signature === 'sandbox_verified';
    }

    if (!isSignatureValid) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
      logger.warn(`[SubscriptionService] Payment signature verification failed for order ${orderId}`);
      throw new BadRequestError('Payment signature verification failed. Subscription was not activated.');
    }

    // Mark transaction as successful
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        paymentId,
        signature,
      },
    });

    // Calculate 30-day active billing cycle
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: SubscriptionPlan.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        amount: transaction.amount,
        currency: transaction.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        documentsAnalyzedThisMonth: 0,
        lastUsageReset: now,
      },
      create: {
        userId,
        plan: SubscriptionPlan.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
        amount: transaction.amount,
        currency: transaction.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        documentsAnalyzedThisMonth: 0,
        lastUsageReset: now,
      },
    });

    logger.info(`[SubscriptionService] Successfully activated Premium subscription for user ${userId} until ${periodEnd.toISOString()}`);

    return {
      success: true,
      subscription,
      message: 'Payment verified successfully! Your LegalAI Premium subscription is now active for 30 days.',
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new BadRequestError('No active subscription found to cancel');
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    logger.info(`[SubscriptionService] User ${userId} requested cancellation at period end (${subscription.currentPeriodEnd.toISOString()})`);

    return {
      success: true,
      subscription: updated,
      message: `Your subscription has been scheduled for cancellation. You will retain full Premium access until ${subscription.currentPeriodEnd.toLocaleDateString('en-IN')}.`,
    };
  }

  async incrementUsage(userId: string) {
    try {
      await prisma.subscription.update({
        where: { userId },
        data: {
          documentsAnalyzedThisMonth: {
            increment: 1,
          },
        },
      });
    } catch {
      // Ignore if user has no subscription record (e.g. admin)
    }
  }

  async submitEnterpriseInquiry(data: {
    userId?: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    expectedUsers?: number;
    notes?: string;
  }) {
    if (!data.name || !data.email) {
      throw new BadRequestError('Name and email are required to contact Enterprise sales');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestError('Invalid email format');
    }

    const lead = await prisma.enterpriseLead.create({
      data: {
        userId: data.userId || null,
        name: data.name,
        email: data.email.toLowerCase(),
        company: data.company || null,
        phone: data.phone || null,
        expectedUsers: data.expectedUsers ? parseInt(String(data.expectedUsers), 10) : null,
        notes: data.notes || null,
        status: 'NEW',
      },
    });

    logger.info(`[SubscriptionService] Recorded Enterprise lead for ${data.name} (${data.company || data.email})`);

    return {
      success: true,
      leadId: lead.id,
      message: 'Thank you! Your Enterprise request has been registered. An enterprise legal solutions specialist will reach out within 24 business hours.',
    };
  }
}
