import pdfParse from 'pdf-parse';
import { DocumentParser, DocumentParserResult, ExtractedPage } from './parser.interface';
import { logger } from '../../config/logger';

export class PdfParser implements DocumentParser {
  private sanitizeText(text: string): string {
    return text
      .replace(/\u0000/g, '')
      .replace(/\ufffd+/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  async parse(buffer: Buffer): Promise<DocumentParserResult> {
    try {
      const pageTexts: string[] = [];
      
      const options = {
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let lastY: number | null = null;
            let text = '';
            for (const item of textContent.items) {
              const cleanItemStr = (item.str || '').replace(/\u0000/g, '').replace(/\ufffd+/g, '');
              if (lastY === null || lastY === item.transform[5]) {
                text += cleanItemStr;
              } else {
                text += '\n' + cleanItemStr;
              }
              lastY = item.transform[5];
            }
            const sanitizedPage = this.sanitizeText(text);
            pageTexts.push(sanitizedPage);
            return sanitizedPage;
          });
        }
      };

      const data = await pdfParse(buffer, options);

      const rawFullText = data.text || pageTexts.join('\n\n');
      const fullText = this.sanitizeText(rawFullText);

      const pages: ExtractedPage[] = pageTexts.map((text, index) => ({
        pageNumber: index + 1,
        text: this.sanitizeText(text),
        hasOcr: false,
      }));
      
      // Determine if document appears scanned / empty text
      const totalChars = fullText.replace(/\s+/g, '').length;
      const requiresOcr = totalChars < 50;

      logger.info(`[PdfParser] Extracted ${pages.length} pages, total chars: ${totalChars}, requiresOcr: ${requiresOcr}`);

      return {
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText, hasOcr: false }],
        fullText,
        requiresOcr,
      };
    } catch (err: any) {
      logger.error(`[PdfParser] Error parsing PDF: ${err.message}`);
      return {
        pages: [],
        fullText: '',
        requiresOcr: true,
      };
    }
  }
}
