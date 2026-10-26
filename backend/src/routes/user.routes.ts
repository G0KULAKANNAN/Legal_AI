import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new UserController();

router.get('/me', authenticateToken, (req, res, next) => controller.getMe(req, res, next));
router.patch('/me', authenticateToken, (req, res, next) => controller.updateMe(req, res, next));
router.put('/me', authenticateToken, (req, res, next) => controller.updateMe(req, res, next));

export default router;
