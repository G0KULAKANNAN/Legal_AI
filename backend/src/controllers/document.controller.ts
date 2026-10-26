import { Response, NextFunction } from 'express';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../config/logger';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/prisma';
import { getStorageProvider } from '../services/storage/storage.factory';
import { initQueueWorker } from '../workers/document.worker';
import { ReportService } from '../services/report.service';
import { GeminiProvider } from '../services/ai/gemini.provider';
import { SubscriptionService } from '../services/subscription.service';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { DocumentStatus } from '@prisma/client';
import v4 from 'crypto';

const storage = getStorageProvider();
const workerService = initQueueWorker();
const reportService = new ReportService();
const aiProvider = new GeminiProvider();
const subscriptionService = new SubscriptionService();

export class DocumentController {
  async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('No document file uploaded');
      }

      const userId = req.user!.id;
      const file = req.file;
      const uuid = v4.randomUUID();
      const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
      const storageKey = `documents/${userId}/${uuid}${ext}`;

      // Upload to storage engine
      await storage.uploadFile(storageKey, file.buffer, file.mimetype);

      // Save document record in PostgreSQL
      const document = await prisma.document.create({
        data: {
          userId,
          filename: `${uuid}${ext}`,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storageKey,
          status: DocumentStatus.UPLOADED,
        },
      });

      // Create processing job record
      await prisma.processingJob.create({
        data: {
          documentId: document.id,
          status: DocumentStatus.UPLOADED,
        },
      });

      // Enqueue job to background queue
      await workerService.enqueueJob(document.id);

      // Increment monthly document usage counter for subscription
      await subscriptionService.incrementUsage(userId);

      return sendSuccess(res, document, 'Document uploaded successfully. Processing started.', 202);
    } catch (err) {
      next(err);
    }
  }

  async getDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const documents = await prisma.document.findMany({
        where: { userId },
        include: {
          analysis: {
            select: {
              documentType: true,
              summaryPlain: true,
              scamScore: true,
              _count: {
                select: {
                  risks: true,
                  clauses: true,
                  charges: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, documents);
    } catch (err) {
      next(err);
    }
  }

  async getDocumentById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const document = await prisma.document.findFirst({
        where: userId ? { id, userId } : { id },
        include: {
          analysis: {
            include: {
              clauses: true,
              risks: true,
              charges: true,
              penalties: true,
              importantDates: true,
              timelineEvents: { orderBy: { sequenceOrder: 'asc' } },
              fairnessAnalyses: true,
            },
          },
        },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      if (document.analysis && document.analysis.rawAiResponse) {
        const raw = document.analysis.rawAiResponse as any;
        (document.analysis as any).partiesInvolved = raw.partiesInvolved || null;
        (document.analysis as any).structuredSummary = raw.structuredSummary || null;
        (document.analysis as any).structuredSummaryTamil = raw.structuredSummaryTamil || null;
      }

      return sendSuccess(res, document);
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const doc = await prisma.document.findFirst({ where: { id, userId } });
      if (!doc) {
        throw new NotFoundError('Document not found');
      }

      // Delete storage file
      await storage.deleteFile(doc.storageKey).catch(() => {});

      // Delete DB record (cascading deletes child pages, clauses, risks, etc.)
      await prisma.document.delete({ where: { id } });

      return sendSuccess(res, null, 'Document and associated analysis data deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const doc = await prisma.document.findFirst({
        where: { id, userId },
        select: { id: true, status: true, processingError: true, updatedAt: true },
      });

      if (!doc) {
        throw new NotFoundError('Document not found');
      }

      return sendSuccess(res, doc);
    } catch (err) {
      next(err);
    }
  }

  async compareDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { docAId, docBId } = req.body;
      const userId = req.user!.id;

      if (!docAId || !docBId) {
        throw new BadRequestError('Both docAId and docBId are required');
      }

      const docA = await prisma.document.findFirst({
        where: { id: docAId, userId },
        include: { pages: true },
      });
      const docB = await prisma.document.findFirst({
        where: { id: docBId, userId },
        include: { pages: true },
      });

      if (!docA || !docB) {
        throw new NotFoundError('One or both specified documents were not found');
      }

      const textA = docA.pages.map((p) => p.extractedText).join('\n');
      const textB = docB.pages.map((p) => p.extractedText).join('\n');

      const result = await aiProvider.compareDocuments(textA, textB);

      const comparison = await prisma.documentComparison.create({
        data: {
          userId,
          docAId,
          docBId,
          diffSummary: result.diffSummary,
          addedClauses: result.addedClauses as any,
          removedClauses: result.removedClauses as any,
          modifiedClauses: result.modifiedClauses as any,
        },
      });

      return sendSuccess(res, comparison, 'Document comparison generated successfully');
    } catch (err) {
      next(err);
    }
  }

  async generateReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await reportService.generatePdfReport(id, userId);
      return sendSuccess(res, result, 'PDF Report generated successfully');
    } catch (err) {
      next(err);
    }
  }

  async translateSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const text = req.body.text || req.body.summary;
      const targetLang = req.body.targetLang || req.body.lang || 'ta';

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new BadRequestError('Text to translate is required and cannot be empty');
      }

      const translatedText = await aiProvider.translateText(text.trim(), targetLang);

      return sendSuccess(res, {
        translatedText,
        targetLang,
      });
    } catch (err) {
      next(err);
    }
  }

  async generateVoiceScript(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summaryText = req.body.text || req.body.summary;
      const lang = req.body.lang || req.body.targetLang || 'ta';

      if (!summaryText || typeof summaryText !== 'string' || summaryText.trim().length === 0) {
        throw new BadRequestError('Summary text is required to generate voice script');
      }

      const script = await aiProvider.generateVoiceScript(summaryText.trim(), lang);

      return sendSuccess(res, {
        script,
        lang,
      });
    } catch (err) {
      next(err);
    }
  }

  async streamTTS(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const text = (req.method === 'POST' ? req.body.text : req.query.text) as string;
      const lang = ((req.method === 'POST' ? req.body.lang : req.query.lang) || 'ta') as string;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new BadRequestError('Text is required to stream speech');
      }

      const cleanText = text
        .replace(/[#*`_>~]/g, '')
        .replace(/\ufffd+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      let textToSynthesize = cleanText;

      // If Tamil speech is requested, ensure the text is actually in Tamil.
      // If the input text is in English, convert it to a natural spoken Tamil voice script first.
      if (lang === 'ta' || lang.startsWith('ta')) {
        const hasTamilCharacters = /[\u0B80-\u0BFF]/.test(cleanText);
        if (!hasTamilCharacters) {
          try {
            logger.info(`[TTS] Converting English text to Tamil voice script before synthesis...`);
            textToSynthesize = await aiProvider.generateVoiceScript(cleanText, 'ta');
            logger.info(`[TTS] Voice script generated (${textToSynthesize.length} chars).`);
          } catch (vsErr: any) {
            logger.warn(`[TTS] Voice script generation failed, falling back to original: ${vsErr.message}`);
          }
        }
      }

      // Chunk into segments <= 140 chars for Google TTS
      const words = textToSynthesize.split(' ');
      const chunks: string[] = [];
      let current = '';

      for (const w of words) {
        if ((current + ' ' + w).length > 130) {
          if (current.trim()) chunks.push(current.trim());
          current = w;
        } else {
          current = (current + ' ' + w).trim();
        }
      }
      if (current.trim()) chunks.push(current.trim());

      const targetChunks = chunks.slice(0, 20); // Cap to avoid runaway requests

      const https = await import('https');
      const fetchChunk = (chunkText: string): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;
          const ttsReq = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
            if (response.statusCode && response.statusCode >= 400) {
              return reject(new Error(`TTS upstream error: ${response.statusCode}`));
            }
            const data: Buffer[] = [];
            response.on('data', (d) => data.push(d));
            response.on('end', () => resolve(Buffer.concat(data)));
          });
          ttsReq.on('error', reject);
        });
      };

      const buffers: Buffer[] = [];
      for (const c of targetChunks) {
        try {
          const b = await fetchChunk(c);
          buffers.push(b);
        } catch (e: any) {
          logger.warn(`[TTS] Failed to synthesize chunk: ${c.substring(0, 20)}... (${e.message})`);
        }
      }

      if (buffers.length === 0) {
        throw new Error('TTS audio generation failed');
      }

      const combined = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', combined.length);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.status(200).send(combined);
    } catch (err) {
      next(err);
    }
  }

  async serveFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rawKey = req.params.key || req.params[0] || (req.query.key as string);
      if (!rawKey) {
        throw new BadRequestError('File key is required');
      }

      const decodedKey = decodeURIComponent(rawKey);
      // Security: prevent directory traversal
      const safeKey = path.normalize(decodedKey).replace(/^(\.\.[\/\\])+/, '');

      const buffer = await storage.downloadFile(safeKey);

      const mimeType = safeKey.endsWith('.pdf')
        ? 'application/pdf'
        : safeKey.endsWith('.png')
        ? 'image/png'
        : safeKey.endsWith('.jpg') || safeKey.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(safeKey)}"`);
      return res.status(200).send(buffer);
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        throw new NotFoundError('Requested file not found');
      }
      next(err);
    }
  }
}
