import { Router } from 'express';
import { ReminderController } from '../controllers/reminder.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new ReminderController();

// Vercel Cron trigger endpoint (unauthenticated or verified via CRON_SECRET)
router.get('/cron', (req, res, next) => controller.handleCronReminders(req, res, next));

router.use(authenticateToken);

router.get('/', (req, res, next) => controller.getReminders(req, res, next));
router.post('/', (req, res, next) => controller.createReminder(req, res, next));
router.patch('/:id/status', (req, res, next) => controller.updateReminderStatus(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteReminder(req, res, next));

export default router;
