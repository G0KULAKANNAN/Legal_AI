import { DocumentAnalysisResult, ChatAnswerResult, ComparisonResult } from './schemas';

export interface AIProvider {
  analyzeDocument(fullText: string, documentType?: string): Promise<DocumentAnalysisResult>;
  answerQuestion(documentContext: string, question: string, chatHistory?: { role: string; content: string }[], lang?: 'en' | 'ta'): Promise<ChatAnswerResult>;
  compareDocuments(textA: string, textB: string): Promise<ComparisonResult>;
  generateGeneralChat?(message: string, history?: { role: string; content: string }[], documentContext?: string, lang?: 'en' | 'ta'): Promise<string>;
}
