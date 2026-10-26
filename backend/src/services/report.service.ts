import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma';
import { getStorageProvider } from './storage/storage.factory';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export class ReportService {
  private storage = getStorageProvider();

  async generatePdfReport(documentId: string, userId: string): Promise<{ pdfUrl: string; reportId: string }> {
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
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

    if (!doc || !doc.analysis) {
      throw new NotFoundError('Document or analysis report not found');
    }

    const analysis = doc.analysis;
    const pdfBuffer = await this.buildPdfBuffer(doc, analysis);

    const reportKey = `reports/${documentId}_report_${Date.now()}.pdf`;
    await this.storage.uploadFile(reportKey, pdfBuffer, 'application/pdf');

    const signedUrl = await this.storage.getSignedUrl(reportKey, 86400); // 24 hours

    const report = await prisma.report.create({
      data: {
        analysisId: analysis.id,
        pdfUrl: signedUrl,
      },
    });

    logger.info(`[ReportService] Generated report PDF for document ${documentId}`);

    return {
      pdfUrl: signedUrl,
      reportId: report.id,
    };
  }

  private buildPdfBuffer(doc: any, analysis: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdf = new PDFDocument({
          margins: { top: 32, bottom: 0, left: 32, right: 32 },
          size: 'A4',
          bufferPages: true,
          autoFirstPage: true,
        });
        const chunks: Buffer[] = [];

        pdf.on('data', (chunk) => chunks.push(chunk));
        pdf.on('end', () => resolve(Buffer.concat(chunks)));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 32;
        const contentWidth = pageWidth - (margin * 2);

        const cleanText = (str: string): string => {
          if (!str) return '';
          return str
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u2022]/g, '-')
            .replace(/₹/g, 'Rs. ')
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\(\s*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };

        const checkPageBreak = (neededHeight: number) => {
          const maxContentY = pageHeight - 40;
          if (pdf.y + neededHeight > maxContentY) {
            pdf.addPage();
            // Secondary page top header
            pdf.rect(margin, 20, contentWidth, 22).fillAndStroke('#f8fafc', '#e2e8f0');
            pdf.fillColor('#1d4ed8').fontSize(8.5).font('Helvetica-Bold')
              .text('Structured Legal Document Summary', margin + 8, 26);
            pdf.fillColor('#64748b').fontSize(7.5).font('Helvetica')
              .text(`${cleanText(doc.originalName)}  •  ${cleanText(analysis.documentType || 'Legal Agreement')}`, margin + 8, 26, { width: contentWidth - 16, align: 'right' });
            pdf.y = 50;
          }
        };

        // 1. TOP HEADER BANNER (Matching the Web UI Card Header, NO Language/Copy buttons)
        pdf.rect(margin, 28, 4, 30).fill('#2563eb');
        pdf.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold')
          .text('Structured Legal Document Summary', margin + 12, 28);
        pdf.fillColor('#64748b').fontSize(8).font('Helvetica')
          .text('Comprehensive 10-point intelligence breakdown extracted from the contract.', margin + 12, 46);

        // Document Details Strip
        const metaY = 64;
        pdf.roundedRect(margin, metaY, contentWidth, 20, 4).fillAndStroke('#f1f5f9', '#e2e8f0');
        pdf.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold')
          .text(`Document: ${cleanText(doc.originalName)}`, margin + 8, metaY + 6);
        pdf.fillColor('#2563eb').fontSize(7.5).font('Helvetica-Bold')
          .text(`Type: ${cleanText(analysis.documentType || 'Legal Agreement')}`, margin + 8, metaY + 6, { width: contentWidth - 16, align: 'right' });

        pdf.y = 92;

        // Card Drawing Helper
        const drawCard = (
          title: string,
          titleColor: string,
          bgColor: string,
          borderColor: string,
          items: { label?: string; text: string; isBullet?: boolean }[]
        ) => {
          pdf.fontSize(8);
          let textHeight = 0;
          for (const it of items) {
            const lineStr = (it.label ? `${it.label}: ` : '') + (it.isBullet ? '• ' : '') + it.text;
            textHeight += pdf.heightOfString(lineStr, { width: contentWidth - 24, lineGap: 2 }) + 4;
          }
          const cardHeight = Math.max(38, 20 + textHeight + 6);

          checkPageBreak(cardHeight);

          const startY = pdf.y;
          pdf.roundedRect(margin, startY, contentWidth, cardHeight, 5).fillAndStroke(bgColor, borderColor);

          // Card Title
          pdf.fillColor(titleColor).fontSize(8.5).font('Helvetica-Bold')
            .text(title, margin + 12, startY + 7);

          let curY = startY + 20;
          for (const it of items) {
            pdf.fontSize(8);
            if (it.label) {
              pdf.font('Helvetica-Bold').fillColor('#0f172a').text(it.label + ': ', margin + 12, curY, { continued: true });
              pdf.font('Helvetica').fillColor('#334155').text(it.text, { width: contentWidth - 24, lineGap: 2 });
            } else if (it.isBullet) {
              pdf.font('Helvetica-Bold').fillColor('#0f172a').text('• ', margin + 12, curY, { continued: true });
              pdf.font('Helvetica').fillColor('#334155').text(it.text, { width: contentWidth - 24, lineGap: 2 });
            } else {
              pdf.font('Helvetica').fillColor('#334155').text(it.text, margin + 12, curY, { width: contentWidth - 24, lineGap: 2 });
            }
            curY = pdf.y + 3;
          }

          pdf.y = startY + cardHeight + 7;
        };

        // 1. DOCUMENT OVERVIEW
        drawCard(
          '1. DOCUMENT OVERVIEW',
          '#1d4ed8',
          '#f8fafc',
          '#e2e8f0',
          [
            { label: 'Document Type', text: cleanText(analysis.documentType || 'Legal Agreement') },
            { label: 'Main Purpose', text: cleanText(analysis.summaryPlain) },
            { text: 'Binding agreement setting rights, financial charges, and termination guidelines.' },
          ]
        );

        // 2. PARTIES INVOLVED
        const partiesText = cleanText(
          analysis.partiesInvolved ||
          (analysis as any).rawAiResponse?.partiesInvolved ||
          'Executing entities and authorities stipulated in document preamble.'
        );
        drawCard(
          '2. PARTIES INVOLVED',
          '#1d4ed8',
          '#f8fafc',
          '#e2e8f0',
          [
            { text: partiesText },
          ]
        );

        // 3. KEY FACTS & CIRCUMSTANCES
        drawCard(
          '3. KEY FACTS & CIRCUMSTANCES',
          '#1d4ed8',
          '#f8fafc',
          '#e2e8f0',
          [
            { text: cleanText(analysis.summaryDetailed) },
          ]
        );

        // 4. IMPORTANT LEGAL PROVISIONS
        const clauseItems = analysis.clauses && analysis.clauses.length > 0
          ? analysis.clauses.map((c: any) => ({
              label: cleanText(c.title) + (c.category ? ` (${cleanText(c.category)})` : ''),
              text: cleanText(c.explanationPlain),
              isBullet: true,
            }))
          : [{ text: 'Standard legal clauses governing obligations, notice periods, and dispute resolution apply.' }];
        drawCard(
          '4. IMPORTANT LEGAL PROVISIONS',
          '#1d4ed8',
          '#f8fafc',
          '#e2e8f0',
          clauseItems
        );

        // 5. RIGHTS & CORE OBLIGATIONS
        drawCard(
          '5. RIGHTS & CORE OBLIGATIONS',
          '#047857',
          '#f8fafc',
          '#e2e8f0',
          [
            { text: cleanText(analysis.whatYouAreAgreeingTo) },
          ]
        );

        // 6. KEY TERMS & FINANCIAL OBLIGATIONS
        const finItems: { label?: string; text: string; isBullet?: boolean }[] = [
          { label: 'Financial Terms', text: cleanText(analysis.financialSummary) || 'Standard financial terms apply.' },
        ];
        if (analysis.penalties && analysis.penalties.length > 0) {
          for (const p of analysis.penalties) {
            finItems.push({
              label: `Penalty Condition (${cleanText(p.triggerCondition)})`,
              text: cleanText(p.penaltyAmountOrTerm || p.explanation),
              isBullet: true,
            });
          }
        }
        drawCard(
          '6. KEY TERMS & FINANCIAL OBLIGATIONS',
          '#1d4ed8',
          '#f8fafc',
          '#e2e8f0',
          finItems
        );

        // 7. IMPORTANT DATES & TIMELINE
        const timelineItems = analysis.timelineEvents && analysis.timelineEvents.length > 0
          ? analysis.timelineEvents.map((t: any) => ({
              label: cleanText(t.eventDate || `Step ${t.sequenceOrder}`),
              text: `${cleanText(t.title)} - ${cleanText(t.description)}`,
              isBullet: true,
            }))
          : [{ text: 'Standard execution timeline and notice deadlines apply.' }];
        drawCard(
          '7. IMPORTANT DATES & TIMELINE',
          '#b45309',
          '#f8fafc',
          '#e2e8f0',
          timelineItems
        );

        // 8. LEGAL ISSUES & FINDINGS
        const riskItems = analysis.risks && analysis.risks.length > 0
          ? analysis.risks.map((r: any) => ({
              label: `[${r.riskLevel} CONCERN] ${cleanText(r.title)}`,
              text: cleanText(r.reasonPlain),
              isBullet: true,
            }))
          : [{ text: 'No immediate high-risk structural legal issues identified.' }];
        drawCard(
          '8. LEGAL ISSUES & FINDINGS',
          '#b45309',
          '#f8fafc',
          '#e2e8f0',
          riskItems
        );

        // 9. PRACTICAL TAKEAWAYS
        drawCard(
          '9. PRACTICAL TAKEAWAYS',
          '#047857',
          '#f8fafc',
          '#e2e8f0',
          [
            { text: `${cleanText(analysis.summaryPlain)} Always verify deposit refund procedures, notice periods, and maintenance caps before executing.` },
          ]
        );

        // 10. IMPORTANT CAUTIONS & RED FLAGS
        const cautionItems = analysis.risks && analysis.risks.filter((r: any) => r.riskLevel === 'HIGH').length > 0
          ? analysis.risks.filter((r: any) => r.riskLevel === 'HIGH').map((r: any) => ({
              label: `CAUTION: ${cleanText(r.title)}`,
              text: cleanText(r.reasonPlain),
              isBullet: true,
            }))
          : [{ text: 'Do not transfer advance deposit funds until all oral promises are reflected in writing.' }];
        drawCard(
          '10. IMPORTANT CAUTIONS & RED FLAGS',
          '#991b1b',
          '#fef2f2',
          '#fecaca',
          cautionItems
        );

        // Bottom Disclaimer
        checkPageBreak(32);
        pdf.fillColor('#64748b').fontSize(6.5).font('Helvetica')
          .text(
            'MANDATORY LEGAL DISCLAIMER: LegalAI provides automated document intelligence for informational and educational purposes only. It does not constitute formal legal counsel. Always review binding agreements with a qualified legal professional before signing.',
            margin,
            pdf.y + 4,
            { width: contentWidth, align: 'justify', lineGap: 1.5 }
          );

        // Draw Footer on all buffered pages
        const range = pdf.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          pdf.switchToPage(i);
          pdf.save();
          pdf.strokeColor('#e2e8f0').lineWidth(0.5)
            .moveTo(margin, pageHeight - 24)
            .lineTo(margin + contentWidth, pageHeight - 24)
            .stroke();
          pdf.fillColor('#94a3b8').fontSize(7).font('Helvetica');
          pdf.text(
            `LegalAI Document Intelligence  •  "Do Not Sign Before Reviewing the Document"  •  Page ${i + 1} of ${range.count}`,
            margin,
            pageHeight - 18,
            { width: contentWidth, align: 'center', lineBreak: false }
          );
          pdf.restore();
        }

        pdf.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
