import { createWorker } from 'tesseract.js';
import { OCRProvider } from './ocr.interface';
import { logger } from '../../config/logger';

export class TesseractOCRProvider implements OCRProvider {
  async processImage(imageBuffer: Buffer, language = 'eng+tam'): Promise<string> {
    logger.info(`[TesseractOCRProvider] Starting OCR recognition (languages: ${language})...`);
    let worker;
    try {
      worker = await createWorker(language);
      const ret = await worker.recognize(imageBuffer);
      await worker.terminate();
      
      const text = ret.data.text || '';
      logger.info(`[TesseractOCRProvider] OCR completed. Extracted ${text.length} characters.`);
      return text.trim();
    } catch (err: any) {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
      logger.error(`[TesseractOCRProvider] OCR processing error: ${err.message}`);
      throw new Error(`OCR Processing failed: ${err.message}`);
    }
  }
}
