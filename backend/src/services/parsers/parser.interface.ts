export interface ExtractedPage {
  pageNumber: IntNumber;
  text: string;
  hasOcr?: boolean;
}

type IntNumber = number;

export interface DocumentParserResult {
  pages: ExtractedPage[];
  fullText: string;
  requiresOcr: boolean;
}

export interface DocumentParser {
  parse(buffer: Buffer, mimeType: string): Promise<DocumentParserResult>;
}
