import mammoth from 'mammoth';
import { DocumentParser, DocumentParserResult, ExtractedPage } from './parser.interface';
import { logger } from '../../config/logger';

export class DocxParser implements DocumentParser {
  async parse(buffer: Buffer): Promise<DocumentParserResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const fullText = result.value || '';

      // Split DOCX into logical page approximations (every 2500 characters or split by page breaks)
      const paragraphs = fullText.split(/\n\s*\n/);
      const pages: ExtractedPage[] = [];
      let currentPageText = '';
      let pageNum = 1;

      for (const p of paragraphs) {
        if (currentPageText.length + p.length > 2500 && currentPageText.length > 0) {
          pages.push({ pageNumber: pageNum++, text: currentPageText.trim(), hasOcr: false });
          currentPageText = p;
        } else {
          currentPageText += (currentPageText ? '\n\n' : '') + p;
        }
      }
      if (currentPageText.trim().length > 0) {
        pages.push({ pageNumber: pageNum, text: currentPageText.trim(), hasOcr: false });
      }

      logger.info(`[DocxParser] Extracted ${pages.length} section pages from DOCX`);

      return {
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText, hasOcr: false }],
        fullText,
        requiresOcr: false,
      };
    } catch (err: any) {
      logger.error(`[DocxParser] DOCX extraction error: ${err.message}`);
      throw new Error(`Failed to parse DOCX file: ${err.message}`);
    }
  }
}
