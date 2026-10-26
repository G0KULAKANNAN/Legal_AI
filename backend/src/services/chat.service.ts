import { prisma } from '../config/prisma';
import { GeminiProvider } from './ai/gemini.provider';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../config/logger';

export class ChatService {
  private aiProvider = new GeminiProvider();

  async askQuestion(userId: string, documentId: string, question: string, sessionId?: string, lang: 'en' | 'ta' = 'en') {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        pages: true,
      },
    });

    if (!doc) {
      throw new NotFoundError('Document not found or access forbidden');
    }

    if (doc.pages.length === 0) {
      throw new NotFoundError('Document text context is empty or not yet processed');
    }

    // Build RAG context from document pages
    const fullContext = doc.pages
      .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.extractedText}`)
      .join('\n\n');

    // Retrieve or create chat session
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: sessionId, documentId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } },
      });
    }

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          documentId,
          userId,
          title: question.substring(0, 40) + '...',
        },
        include: { messages: true },
      });
    }

    const history = session.messages.map((m) => ({ role: m.role, content: m.content }));

    // Execute Gemini RAG query in the selected language
    const result = await this.aiProvider.answerQuestion(fullContext, question, history, lang);

    // Save user message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'user',
        content: question,
      },
    });

    // Save assistant response strictly with the direct answer
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: 'assistant',
        content: result.answer,
        sources: result.sources as any,
      },
    });

    logger.info(`[ChatService] Answered question for doc ${documentId} (lang: ${lang}) in session ${session.id}`);

    return {
      sessionId: session.id,
      message: assistantMessage,
      foundInDocument: result.foundInDocument,
      sources: result.sources,
      reply: result.answer,
    };
  }

  async askGeneralChat(message: string, history: { role: string; content: string }[] = [], userId?: string, documentId?: string, lang: 'en' | 'ta' = 'en') {
    let documentContext = '';
    if (documentId) {
      const doc = await prisma.document.findFirst({
        where: userId ? { id: documentId, userId } : { id: documentId },
        include: { pages: true },
      });
      if (doc && doc.pages.length > 0) {
        documentContext = doc.pages
          .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.extractedText}`)
          .join('\n\n');
      }
    }

    const reply = await this.aiProvider.generateGeneralChat(message, history, documentContext, lang);

    logger.info(`[ChatService] Processed general chat message (lang: ${lang}, length: ${message.length} chars)`);

    return {
      reply,
    };
  }

  async getChatHistory(userId: string, documentId: string) {
    const sessions = await prisma.chatSession.findMany({
      where: { documentId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sessions;
  }
}
