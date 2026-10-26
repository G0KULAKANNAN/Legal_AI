import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', authRateLimiter, (req, res, next) => controller.register(req, res, next));
router.post('/send-register-otp', authRateLimiter, (req, res, next) => controller.sendRegisterOtp(req, res, next));
router.post('/verify-register-otp', authRateLimiter, (req, res, next) => controller.verifyRegisterOtp(req, res, next));
router.post('/resend-register-otp', authRateLimiter, (req, res, next) => controller.resendRegisterOtp(req, res, next));
router.post('/login', authRateLimiter, (req, res, next) => controller.login(req, res, next));
router.post('/verify-email', (req, res, next) => controller.verifyEmail(req, res, next));
router.post('/refresh', (req, res, next) => controller.refresh(req, res, next));
router.post('/logout', authenticateToken, (req, res, next) => controller.logout(req, res, next));
router.post('/change-password', authenticateToken, (req, res, next) => controller.changePassword(req, res, next));

export default router;
