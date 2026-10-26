import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { optionalAuthenticateToken } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });
const controller = new ChatController();

router.use(optionalAuthenticateToken);

router.post('/chat', (req, res, next) => controller.askQuestion(req, res, next));
router.post('/', (req, res, next) => controller.askGeneralChat(req, res, next));
router.get('/chat', (req, res, next) => controller.getChatHistory(req, res, next));
router.delete('/chat/:sessionId', (req, res, next) => controller.deleteChatSession(req, res, next));
router.delete('/:sessionId', (req, res, next) => controller.deleteChatSession(req, res, next));

export default router;
