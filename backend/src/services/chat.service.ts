import { prisma } from '../config/prisma';
import { GeminiProvider } from './ai/gemini.provider';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../config/logger';

export class ChatService {
  private aiProvider = new GeminiProvider();

  private buildDocumentContext(doc: any): string {
    const pagesText = (doc.pages || [])
      .map((p: any) => `--- PAGE ${p.pageNumber} ---\n${p.extractedText}`)
      .join('\n\n');

    let analysisContext = '';
    if (doc.analysis) {
      const a = doc.analysis;
      const risksList = a.risks && a.risks.length > 0
        ? a.risks.map((r: any, i: number) => `${i + 1}. [${r.riskLevel}] ${r.title}\n   - Details: ${r.reasonPlain}\n   - Tamil: ${r.reasonTamil}${r.suggestedNegotiation ? `\n   - Advice: ${r.suggestedNegotiation}` : ''}`).join('\n')
        : 'None identified during initial audit.';

      const clausesList = a.clauses && a.clauses.length > 0
        ? a.clauses.map((c: any, i: number) => `${i + 1}. ${c.title} (Risk: ${c.riskLevel}): ${c.explanationPlain}`).join('\n')
        : 'Standard clauses.';

      const penaltiesList = a.penalties && a.penalties.length > 0
        ? a.penalties.map((p: any, i: number) => `${i + 1}. Condition: ${p.condition} | Consequence: ${p.consequence}`).join('\n')
        : 'None noted.';

      const chargesList = a.charges && a.charges.length > 0
        ? a.charges.map((ch: any, i: number) => `${i + 1}. ${ch.name}: ${ch.amountCondition}`).join('\n')
        : 'None noted.';

      analysisContext = `[AUDITED LEGAL ANALYSIS FOR THIS DOCUMENT]:
- Document Type: ${a.documentType}
- Executive Summary (English): ${a.summaryPlain}
- Executive Summary (Tamil): ${a.summaryTamil}
- What User Agrees To: ${a.whatYouAreAgreeingTo}
- Financial Overview: ${a.financialSummary}
- Suspicion/Scam Score: ${(a.scamScore * 100).toFixed(0)}% (${a.scamAnalysis || 'Standard'})

- IDENTIFIED RISKS & CONCERNS:
${risksList}

- KEY AUDITED CLAUSES:
${clausesList}

- PENALTIES & LIABILITIES:
${penaltiesList}

- CHARGES & FEES:
${chargesList}
`;
    }

    if (analysisContext && pagesText) {
      return `${analysisContext}\n\n[ORIGINAL DOCUMENT EXTRACTED TEXT]:\n${pagesText}`;
    }
    return analysisContext || pagesText;
  }

  async askQuestion(userId: string, documentId: string, question: string, sessionId?: string, lang: 'en' | 'ta' = 'en') {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
        analysis: {
          include: {
            risks: true,
            clauses: true,
            penalties: true,
            charges: true,
            importantDates: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundError('Document not found or access forbidden');
    }

    if ((!doc.pages || doc.pages.length === 0) && !doc.analysis) {
      throw new NotFoundError('Document text context is empty or not yet processed');
    }

    // Build comprehensive RAG context from audited legal analysis and pages
    const fullContext = this.buildDocumentContext(doc);

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
        include: {
          pages: { orderBy: { pageNumber: 'asc' } },
          analysis: {
            include: {
              risks: true,
              clauses: true,
              penalties: true,
              charges: true,
              importantDates: true,
            },
          },
        },
      });
      if (doc) {
        documentContext = this.buildDocumentContext(doc);
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
