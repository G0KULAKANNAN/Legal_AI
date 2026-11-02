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
      let analysisResult: any;

      // Step 3: Text extraction & Document processing
      if (doc.mimeType === 'application/pdf') {
        const parsed = await this.pdfParser.parse(buffer);
        fullText = parsed.fullText;
        pagesData = parsed.pages;

        if (!parsed.requiresOcr && fullText.trim().length >= 50) {
          logger.info(`[PipelineService] Extracted ${fullText.length} text characters from digital PDF.`);
          await prisma.document.update({
            where: { id: documentId },
            data: { status: DocumentStatus.ANALYZING },
          });
          analysisResult = await this.aiProvider.analyzeDocument(fullText, doc.detectedType || undefined);
        } else {
          // Scanned PDF (e.g. DocScanner): Use Gemini Multimodal Vision directly on raw PDF buffer
          logger.info(`[PipelineService] Scanned PDF detected (chars: ${fullText.length}). Running Gemini multimodal analysis on raw PDF buffer...`);
          await prisma.document.update({
            where: { id: documentId },
            data: { status: DocumentStatus.ANALYZING },
          });

          if (this.aiProvider.analyzeDocumentWithBuffer) {
            analysisResult = await this.aiProvider.analyzeDocumentWithBuffer(
              buffer,
              doc.mimeType,
              fullText,
              doc.detectedType || undefined
            );
          } else {
            analysisResult = await this.aiProvider.analyzeDocument(fullText || 'Scanned Legal Document', doc.detectedType || undefined);
          }

          const reconstructedText = `${analysisResult.summaryPlain}\n\n${analysisResult.whatYouAreAgreeingTo || ''}\n\n${analysisResult.financialSummary || ''}`;
          pagesData = [{ pageNumber: 1, text: reconstructedText, hasOcr: true }];
          fullText = reconstructedText;
        }
      } else if (doc.mimeType.startsWith('image/')) {
        logger.info(`[PipelineService] Image document detected. Running Gemini multimodal analysis on image buffer...`);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.ANALYZING },
        });

        if (this.aiProvider.analyzeDocumentWithBuffer) {
          analysisResult = await this.aiProvider.analyzeDocumentWithBuffer(
            buffer,
            doc.mimeType,
            '',
            doc.detectedType || undefined
          );
        } else {
          analysisResult = await this.aiProvider.analyzeDocument('Scanned Image Document', doc.detectedType || undefined);
        }

        const reconstructedText = `${analysisResult.summaryPlain}\n\n${analysisResult.whatYouAreAgreeingTo || ''}\n\n${analysisResult.financialSummary || ''}`;
        pagesData = [{ pageNumber: 1, text: reconstructedText, hasOcr: true }];
        fullText = reconstructedText;
      } else if (doc.mimeType.includes('wordprocessingml') || doc.originalName.endsWith('.docx')) {
        const parsed = await this.docxParser.parse(buffer);
        fullText = parsed.fullText;
        pagesData = parsed.pages;

        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.ANALYZING },
        });
        analysisResult = await this.aiProvider.analyzeDocument(fullText, doc.detectedType || undefined);
      } else {
        throw new Error(`Unsupported document MIME type: ${doc.mimeType}`);
      }

      if (!analysisResult) {
        throw new Error('Could not analyze legal document.');
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

      // Step 7: Save structured analysis in DB transaction
      await prisma.$transaction(
        async (tx) => {
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

          // Clauses (batched insert)
          if (analysisResult.clauses && analysisResult.clauses.length > 0) {
            await tx.clause.createMany({
              data: analysisResult.clauses.map((c: any) => ({
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
              })),
            });
          }

          // Risks (batched insert)
          if (analysisResult.risks && analysisResult.risks.length > 0) {
            await tx.risk.createMany({
              data: analysisResult.risks.map((r: any) => ({
                analysisId: analysis.id,
                riskLevel: (r.riskLevel as RiskLevel) || RiskLevel.MEDIUM,
                title: r.title,
                reasonPlain: r.reasonPlain,
                reasonTamil: r.reasonTamil,
                sourceRef: r.sourceRef || null,
                suggestedNegotiation: r.suggestedNegotiation || null,
              })),
            });
          }

          // Charges (batched insert)
          if (analysisResult.charges && analysisResult.charges.length > 0) {
            await tx.charge.createMany({
              data: analysisResult.charges.map((ch: any) => ({
                analysisId: analysis.id,
                name: ch.name,
                amountCondition: ch.amountCondition,
                sourceRef: ch.sourceRef || null,
                explanation: ch.explanation,
              })),
            });
          }

          // Penalties (batched insert)
          if (analysisResult.penalties && analysisResult.penalties.length > 0) {
            await tx.penalty.createMany({
              data: analysisResult.penalties.map((p: any) => ({
                analysisId: analysis.id,
                triggerCondition: p.triggerCondition,
                penaltyAmountOrTerm: p.penaltyAmountOrTerm,
                sourceRef: p.sourceRef || null,
                explanation: p.explanation,
              })),
            });
          }

          // Important Dates (batched insert)
          if (analysisResult.importantDates && analysisResult.importantDates.length > 0) {
            await tx.importantDate.createMany({
              data: analysisResult.importantDates.map((d: any) => ({
                analysisId: analysis.id,
                dateString: d.dateString,
                eventType: d.eventType,
                explanation: d.explanation,
                sourceRef: d.sourceRef || null,
              })),
            });
          }

          // Timeline Events (batched insert)
          if (analysisResult.timelineEvents && analysisResult.timelineEvents.length > 0) {
            await tx.timelineEvent.createMany({
              data: analysisResult.timelineEvents.map((te: any) => ({
                analysisId: analysis.id,
                sequenceOrder: te.sequenceOrder,
                eventDate: te.eventDate || null,
                title: te.title,
                description: te.description,
                sourceRef: te.sourceRef || null,
              })),
            });
          }

          // Fairness Analyses (batched insert)
          if (analysisResult.fairnessAnalyses && analysisResult.fairnessAnalyses.length > 0) {
            await tx.fairnessAnalysis.createMany({
              data: analysisResult.fairnessAnalyses.map((fa: any) => ({
                analysisId: analysis.id,
                clauseTitle: fa.clauseTitle,
                benchmarkCategory: fa.benchmarkCategory,
                imbalanceScore: fa.imbalanceScore,
                reason: fa.reason,
                evidence: fa.evidence,
                suggestedAlternative: fa.suggestedAlternative || null,
              })),
            });
          }
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

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
