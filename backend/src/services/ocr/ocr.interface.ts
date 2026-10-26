export interface OCRProvider {
  processImage(imageBuffer: Buffer, language?: string): Promise<string>;
}
