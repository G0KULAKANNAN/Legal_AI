import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ChatService } from '../services/chat.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';
import { prisma } from '../config/prisma';

const chatService = new ChatService();

export class ChatController {
  async askGeneralChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const message = req.body.message || req.body.question;
      const history = req.body.history || [];
      const documentId = req.body.documentId || req.params?.id;
      let userId = req.user?.id;
      const lang = (req.body.lang || req.body.targetLang || 'en') as 'en' | 'ta';

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new BadRequestError('Message cannot be empty');
      }

      if (message.length > 4000) {
        throw new BadRequestError('Message exceeds maximum allowed length of 4000 characters');
      }

      if (!userId && documentId) {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (doc) userId = doc.userId;
      }

      const result = await chatService.askGeneralChat(message.trim(), history, userId, documentId, lang);
      return res.status(200).json({
        success: true,
        reply: result.reply,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async askQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const documentId = req.params?.id || req.body.documentId;
      const question = req.body.question || req.body.message;
      const sessionId = req.body.sessionId;
      let userId = req.user?.id;
      const lang = (req.body.lang || req.body.targetLang || 'en') as 'en' | 'ta';

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        throw new BadRequestError('Question cannot be empty');
      }

      if (question.length > 4000) {
        throw new BadRequestError('Question exceeds maximum allowed length of 4000 characters');
      }

      if (!userId && documentId) {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (doc) userId = doc.userId;
      }

      if (userId && documentId) {
        const result = await chatService.askQuestion(userId, documentId, question.trim(), sessionId, lang);
        return res.status(200).json({
          success: true,
          reply: result.reply,
          data: result,
        });
      } else {
        const result = await chatService.askGeneralChat(question.trim(), req.body.history || [], userId, documentId, lang);
        return res.status(200).json({
          success: true,
          reply: result.reply,
          data: result,
        });
      }
    } catch (err) {
      next(err);
    }
  }

  async getChatHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: documentId } = req.params;
      let userId = req.user?.id;

      if (!userId && documentId) {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (doc) userId = doc.userId;
      }

      if (!userId) {
        return sendSuccess(res, []);
      }

      const history = await chatService.getChatHistory(userId, documentId);
      return sendSuccess(res, history);
    } catch (err) {
      next(err);
    }
  }

  async deleteChatSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId || req.body.sessionId;
      if (!sessionId) {
        throw new BadRequestError('Session ID is required');
      }
      await prisma.chatSession.deleteMany({ where: { id: sessionId } });
      return sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  }
}
