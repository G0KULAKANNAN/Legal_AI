import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { ChatController } from '../controllers/chat.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();
const controller = new DocumentController();
const chatController = new ChatController();

// Unauthenticated file serving (safe key check inside controller)
router.get('/file/*', optionalAuthenticateToken, (req, res, next) => controller.serveFile(req, res, next));
router.get('/file/:key', optionalAuthenticateToken, (req, res, next) => controller.serveFile(req, res, next));

// All document management and AI analysis endpoints require authentication
router.use(authenticateToken);

// User Document Listing and Viewing (requires active authenticated session)
router.get('/', (req, res, next) => controller.getDocuments(req, res, next));
router.get('/:id', (req, res, next) => controller.getDocumentById(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteDocument(req, res, next));
router.get('/:id/status', (req, res, next) => controller.getStatus(req, res, next));

// Protected Paid AI Features: REQUIRE ACTIVE SUBSCRIPTION (Premium ₹299/mo or Enterprise)
router.post('/upload', requireActiveSubscription, aiRateLimiter, uploadMiddleware.single('file'), (req, res, next) => controller.uploadDocument(req, res, next));
router.post('/compare', requireActiveSubscription, aiRateLimiter, (req, res, next) => controller.compareDocuments(req, res, next));
router.post('/translate', requireActiveSubscription, (req, res, next) => controller.translateSummary(req, res, next));
router.post('/:id/translate', requireActiveSubscription, (req, res, next) => controller.translateSummary(req, res, next));
router.post('/voice-script', requireActiveSubscription, (req, res, next) => controller.generateVoiceScript(req, res, next));
router.post('/:id/voice-script', requireActiveSubscription, (req, res, next) => controller.generateVoiceScript(req, res, next));
router.get('/tts', requireActiveSubscription, (req, res, next) => controller.streamTTS(req, res, next));
router.post('/tts', requireActiveSubscription, (req, res, next) => controller.streamTTS(req, res, next));
router.get('/:id/tts', requireActiveSubscription, (req, res, next) => controller.streamTTS(req, res, next));
router.post('/:id/tts', requireActiveSubscription, (req, res, next) => controller.streamTTS(req, res, next));
router.post('/:id/report', requireActiveSubscription, aiRateLimiter, (req, res, next) => controller.generateReport(req, res, next));
router.get('/:id/report', requireActiveSubscription, aiRateLimiter, (req, res, next) => controller.generateReport(req, res, next));

// Document AI Chat (requires active subscription)
router.get('/:id/chat', requireActiveSubscription, (req, res, next) => chatController.getChatHistory(req, res, next));
router.post('/:id/chat', requireActiveSubscription, (req, res, next) => chatController.askQuestion(req, res, next));
router.delete('/:id/chat/:sessionId', requireActiveSubscription, (req, res, next) => chatController.deleteChatSession(req, res, next));
router.delete('/:id/chat', requireActiveSubscription, (req, res, next) => chatController.deleteChatSession(req, res, next));

export default router;
