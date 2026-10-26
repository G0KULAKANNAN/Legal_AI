import { prisma } from '../config/prisma';
import { getStorageProvider } from './storage/storage.factory';
import { PdfParser } from './parsers/pdf.parser';
import { DocxParser } from './parsers/docx.parser';
import { TesseractOCRProvider } from './ocr/tesseract.ocr';
import { GeminiProvider } from './ai/gemini.provider';
import { DocumentStatus, RiskLevel } from '@prisma/client';
import { logger } from '../config/logger';

export class PipelineService {
  private pdfParser = new PdfParser();
  private docxParser = new DocxParser();
  private ocrProvider = new TesseractOCRProvider();
  private aiProvider = new GeminiProvider();
  private storage = getStorageProvider();

  async processDocument(documentId: string): Promise<void> {
    logger.info(`[PipelineService] Starting document processing for ID: ${documentId}`);

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      logger.error(`[PipelineService] Document not found: ${documentId}`);
      return;
    }

    try {
      // Step 1: Update status to EXTRACTING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.EXTRACTING },
      });

      // Step 2: Download buffer from storage
      const buffer = await this.storage.downloadFile(doc.storageKey);

      let fullText = '';
      let pagesData: { pageNumber: number; text: string; hasOcr?: boolean }[] = [];

      // Step 3: Text extraction
      if (doc.mimeType === 'application/pdf') {
        const parsed = await this.pdfParser.parse(buffer);
        fullText = parsed.fullText;
        pagesData = parsed.pages;

        if (parsed.requiresOcr || fullText.trim().length < 50) {
          logger.info(`[PipelineService] PDF requires OCR. Running Tesseract OCR for doc ID: ${documentId}`);
          await prisma.document.update({
            where: { id: documentId },
            data: { status: DocumentStatus.OCR },
          });

          const ocrText = await this.ocrProvider.processImage(buffer, 'eng+tam');
          fullText = ocrText || fullText;
          pagesData = [{ pageNumber: 1, text: fullText, hasOcr: true }];
        }
      } else if (doc.mimeType.includes('wordprocessingml') || doc.originalName.endsWith('.docx')) {
        const parsed = await this.docxParser.parse(buffer);
        fullText = parsed.fullText;
        pagesData = parsed.pages;
      } else if (doc.mimeType.startsWith('image/')) {
        logger.info(`[PipelineService] Image document detected. Running OCR for doc ID: ${documentId}`);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.OCR },
        });

        fullText = await this.ocrProvider.processImage(buffer, 'eng+tam');
        pagesData = [{ pageNumber: 1, text: fullText, hasOcr: true }];
      } else {
        throw new Error(`Unsupported document MIME type: ${doc.mimeType}`);
      }

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('Could not extract legible text from document.');
      }

      // Step 4: Save pages to DB
      await prisma.documentPage.deleteMany({ where: { documentId } });
      for (const p of pagesData) {
        await prisma.documentPage.create({
          data: {
            documentId,
            pageNumber: p.pageNumber,
            extractedText: p.text,
            hasOcr: !!p.hasOcr,
          },
        });
      }

      // Step 5: Update status to ANALYZING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.ANALYZING },
      });

      // Step 6: Gemini AI Analysis
      const analysisResult = await this.aiProvider.analyzeDocument(fullText, doc.detectedType || undefined);

      // Step 7: Save structured analysis in DB transaction
      await prisma.$transaction(async (tx) => {
        // Delete previous analysis if retry
        const existing = await tx.analysis.findUnique({ where: { documentId } });
        if (existing) {
          await tx.analysis.delete({ where: { documentId } });
        }

        const analysis = await tx.analysis.create({
          data: {
            documentId,
            documentType: analysisResult.documentType,
            summaryPlain: analysisResult.summaryPlain,
            summaryTamil: analysisResult.summaryTamil,
            summaryDetailed: analysisResult.summaryDetailed,
            whatYouAreAgreeingTo: analysisResult.whatYouAreAgreeingTo,
            financialSummary: analysisResult.financialSummary,
            scamScore: analysisResult.scamScore || 0,
            scamAnalysis: analysisResult.scamAnalysis || null,
            rawAiResponse: analysisResult as any,
          },
        });

        // Clauses
        for (const c of analysisResult.clauses) {
          await tx.clause.create({
            data: {
              analysisId: analysis.id,
              title: c.title,
              category: c.category,
              extractedText: c.extractedText,
              pageNumber: c.pageNumber || null,
              explanationPlain: c.explanationPlain,
              explanationTamil: c.explanationTamil,
              riskLevel: (c.riskLevel as RiskLevel) || RiskLevel.LOW,
              confidence: c.confidence || 0.9,
              sourceRef: c.sourceRef || null,
            },
          });
        }

        // Risks
        for (const r of analysisResult.risks) {
          await tx.risk.create({
            data: {
              analysisId: analysis.id,
              riskLevel: (r.riskLevel as RiskLevel) || RiskLevel.MEDIUM,
              title: r.title,
              reasonPlain: r.reasonPlain,
              reasonTamil: r.reasonTamil,
              sourceRef: r.sourceRef || null,
              suggestedNegotiation: r.suggestedNegotiation || null,
            },
          });
        }

        // Charges
        for (const ch of analysisResult.charges) {
          await tx.charge.create({
            data: {
              analysisId: analysis.id,
              name: ch.name,
              amountCondition: ch.amountCondition,
              sourceRef: ch.sourceRef || null,
              explanation: ch.explanation,
            },
          });
        }

        // Penalties
        for (const p of analysisResult.penalties) {
          await tx.penalty.create({
            data: {
              analysisId: analysis.id,
              triggerCondition: p.triggerCondition,
              penaltyAmountOrTerm: p.penaltyAmountOrTerm,
              sourceRef: p.sourceRef || null,
              explanation: p.explanation,
            },
          });
        }

        // Important Dates
        for (const d of analysisResult.importantDates) {
          await tx.importantDate.create({
            data: {
              analysisId: analysis.id,
              dateString: d.dateString,
              eventType: d.eventType,
              explanation: d.explanation,
              sourceRef: d.sourceRef || null,
            },
          });
        }

        // Timeline Events
        for (const te of analysisResult.timelineEvents) {
          await tx.timelineEvent.create({
            data: {
              analysisId: analysis.id,
              sequenceOrder: te.sequenceOrder,
              eventDate: te.eventDate || null,
              title: te.title,
              description: te.description,
              sourceRef: te.sourceRef || null,
            },
          });
        }

        // Fairness Analyses
        for (const fa of analysisResult.fairnessAnalyses) {
          await tx.fairnessAnalysis.create({
            data: {
              analysisId: analysis.id,
              clauseTitle: fa.clauseTitle,
              benchmarkCategory: fa.benchmarkCategory,
              imbalanceScore: fa.imbalanceScore,
              reason: fa.reason,
              evidence: fa.evidence,
              suggestedAlternative: fa.suggestedAlternative || null,
            },
          });
        }
      });

      // Step 8: Update status to COMPLETED
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.COMPLETED,
          detectedType: analysisResult.documentType,
        },
      });

      logger.info(`[PipelineService] Document processing completed successfully for ID: ${documentId}`);
    } catch (error: any) {
      logger.error(`[PipelineService] Processing error for ID ${documentId}: ${error.message}`);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          processingError: error.message,
        },
      });
    }
  }
}
