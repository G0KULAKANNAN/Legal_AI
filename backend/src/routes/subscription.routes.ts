import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new SubscriptionController();

// Public / Unauthenticated routes
router.get('/plans', (req, res, next) => controller.getPlans(req, res, next));
router.post('/enterprise-inquiry', optionalAuthenticateToken, (req, res, next) => controller.contactEnterprise(req, res, next));
router.post('/webhook', (req, res, next) => controller.handleWebhook(req, res, next));

// Authenticated user subscription endpoints
router.get('/status', authenticateToken, (req, res, next) => controller.getStatus(req, res, next));
router.post('/checkout', authenticateToken, (req, res, next) => controller.createCheckout(req, res, next));
router.post('/verify', authenticateToken, (req, res, next) => controller.verifyPayment(req, res, next));
router.post('/verify-payment', authenticateToken, (req, res, next) => controller.verifyPayment(req, res, next));
router.post('/cancel', authenticateToken, (req, res, next) => controller.cancelSubscription(req, res, next));

export default router;
