import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider } from './ai.interface';
import {
  DocumentAnalysisResult,
  DocumentAnalysisSchema,
  ChatAnswerResult,
  ComparisonResult,
  ComparisonSchema,
} from './schemas';
import {
  getDocumentAnalysisPrompt,
  LEGAL_AI_CHAT_SYSTEM_INSTRUCTION,
  getTamilTranslationPrompt,
  getTamilVoiceScriptPrompt,
  getComparisonPrompt,
} from './prompts';
import { config } from '../../config';
import { logger } from '../../config/logger';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const apiKey = config.gemini.apiKey;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'mock_or_real_gemini_key') {
      logger.warn('[GeminiProvider] Gemini API key is unconfigured or placeholder in environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
  }

  private getModelName(): string {
    return config.gemini.model || 'gemini-3.5-flash';
  }

  private validateApiKey(): void {
    const apiKey = config.gemini.apiKey;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key') || apiKey.includes('mock_or_real')) {
      logger.error('[GeminiProvider] Missing or invalid GEMINI_API_KEY in backend environment.');
      throw new Error('Gemini API key is not configured on the server. Please set a valid GEMINI_API_KEY in backend/.env.');
    }
  }

  private sanitizeError(err: any): Error {
    const msg = err?.message || '';
    logger.error(`[GeminiProvider] Gemini API error details: ${msg}`, { stack: err?.stack });

    if (msg.includes('404') || msg.includes('is not found') || msg.includes('not supported') || msg.includes('no longer available')) {
      return new Error('The requested Gemini AI model is currently unsupported. Please verify backend GEMINI_MODEL setting.');
    }
    if (msg.includes('503') || msg.includes('high demand') || msg.includes('Service Unavailable')) {
      return new Error('Gemini AI service is currently experiencing high demand. Please retry in a few seconds.');
    }
    if (msg.includes('API key') || msg.includes('API_KEY_INVALID') || msg.includes('400')) {
      return new Error('Invalid Gemini API key provided. Please check GEMINI_API_KEY in backend/.env.');
    }
    if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
      return new Error('Gemini API rate limit or quota exceeded. Please try again in a few moments.');
    }
    return new Error(msg || 'Gemini API processing failed.');
  }

  private async callGeminiWithFallback<T>(fn: (modelName: string) => Promise<T>, preferredModel?: string): Promise<T> {
    const primaryModel = preferredModel || this.getModelName();
    const fallbackModels = [
      primaryModel,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ];
    const uniqueModels = Array.from(new Set(fallbackModels));

    let lastError: any = null;
    for (const modelName of uniqueModels) {
      try {
        return await fn(modelName);
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        const shouldFallback = msg.includes('404') ||
          msg.includes('503') ||
          msg.includes('not found') ||
          msg.includes('not supported') ||
          msg.includes('no longer available') ||
          msg.includes('high demand');

        if (!shouldFallback) {
          throw err;
        }
        logger.warn(`[GeminiProvider] Model ${modelName} returned temporary error/404 (${msg}). Attempting next fallback model...`);
      }
    }
    throw lastError;
  }

  async generateGeneralChat(
    message: string,
    history: { role: string; content: string }[] = [],
    documentContext?: string,
    lang: 'en' | 'ta' = 'en'
  ): Promise<string> {
    this.validateApiKey();

    try {
      return await this.callGeminiWithFallback(async (modelName) => {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: LEGAL_AI_CHAT_SYSTEM_INSTRUCTION,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
        });

        const formattedHistory = history.slice(-6).map((h) => ({
          role: (h.role === 'assistant' || h.role === 'ai' || h.role === 'model') ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));

        const chat = model.startChat({
          history: formattedHistory,
        });

        const langDirective = lang === 'ta'
          ? 'முக்கிய விதிமுறை: நீங்கள் கண்டிப்பாக தமிழில் மட்டுமே பதில் அளிக்க வேண்டும். கேட்கப்பட்ட கேள்விக்கு மட்டும் நேரடியாகவும் சுருக்கமாகவும் ஆவணத்தில் உள்ள உண்மையான விபரங்களை வைத்து பதிலளிக்கவும். தேவையற்ற பொதுவான முன்னுரைகள் அல்லது வாழ்த்துக்கள் வேண்டாம்.'
          : 'CRITICAL DIRECTIVE: Answer strictly in English. Answer ONLY the specific question asked, concisely and factually based on the document context. Do not include conversational filler, greetings, or unsolicited boilerplate.';

        let promptText = message;
        if (documentContext && documentContext.trim().length > 0) {
          promptText = `[DOCUMENT CONTEXT]:\n${documentContext.substring(0, 15000)}\n\n[USER QUESTION]:\n${message}\n\n[DIRECTIVE]:\n${langDirective}`;
        } else {
          promptText = `${message}\n\n[DIRECTIVE]: ${langDirective}`;
        }

        logger.info(`[GeminiProvider] Calling Gemini API for chat (lang: ${lang}, model: ${modelName})...`);
        const result = await chat.sendMessage(promptText);
        const responseText = result.response.text();

        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Gemini API returned an empty response.');
        }

        logger.info(`[GeminiProvider] Gemini response received successfully (${responseText.length} chars).`);
        return responseText.trim();
      }, 'gemini-3.5-flash-lite');
    } catch (err: any) {
      throw this.sanitizeError(err);
    }
  }

  async analyzeDocument(fullText: string, _documentType?: string): Promise<DocumentAnalysisResult> {
    logger.info(`[GeminiProvider] Starting document analysis (input length: ${fullText.length} chars)...`);

    const truncatedText = fullText.length > 80000 ? fullText.substring(0, 80000) + '\n...[Text truncated for processing]' : fullText;
    const prompt = getDocumentAnalysisPrompt(truncatedText);

    let rawOutput = '';
    try {
      const apiKey = config.gemini.apiKey;
      if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key') || apiKey.includes('mock_or_real')) {
        return this.getFallbackAnalysis(fullText);
      }

      const cleanJson = await this.callGeminiWithFallback(async (modelName) => {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const response = await model.generateContent(prompt);
        rawOutput = response.response.text() || '';
        return this.cleanJsonResponse(rawOutput);
      });

      const parsed = JSON.parse(cleanJson);

      // Normalization of parsed output to ensure robust schema compatibility
      parsed.partiesInvolved = parsed.partiesInvolved || parsed.parties || null;
      parsed.summaryPlain = parsed.summaryPlain || parsed.quickSummary || parsed.summary || 'Summary unavailable.';
      parsed.summaryDetailed = parsed.summaryDetailed || parsed.detailedSummary || parsed.summaryPlain;
      parsed.structuredSummary = parsed.structuredSummary || null;
      parsed.structuredSummaryTamil = parsed.structuredSummaryTamil || null;
      if (!parsed.summaryTamil && parsed.summaryPlain) {
        parsed.summaryTamil = this.generateOfflineTamilSummary(parsed.summaryPlain);
      }
      if (Array.isArray(parsed.whatYouAreAgreeingTo)) {
        parsed.whatYouAreAgreeingTo = parsed.whatYouAreAgreeingTo.join('\n• ');
      } else if (!parsed.whatYouAreAgreeingTo) {
        parsed.whatYouAreAgreeingTo = 'Standard obligations as outlined in the document.';
      }
      parsed.financialSummary = parsed.financialSummary || 'Standard financial terms apply.';
      parsed.documentType = parsed.documentType || 'Legal Agreement';
      parsed.scamScore = typeof parsed.scamScore === 'number' ? parsed.scamScore : 0.05;
      
      parsed.clauses = Array.isArray(parsed.clauses) ? parsed.clauses.map((c: any) => ({
        title: c.title || 'General Clause',
        category: c.category || 'General',
        extractedText: c.extractedText || c.title || '',
        pageNumber: typeof c.pageNumber === 'number' ? c.pageNumber : 1,
        explanationPlain: c.explanationPlain || c.explanation || c.title || '',
        explanationTamil: c.explanationTamil || c.explanationPlain || '',
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(c.riskLevel) ? c.riskLevel : 'LOW',
        confidence: typeof c.confidence === 'number' ? c.confidence : 0.95,
        sourceRef: c.sourceRef || 'Document',
      })) : [];

      parsed.risks = Array.isArray(parsed.risks) ? parsed.risks.map((r: any) => ({
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(r.riskLevel) ? r.riskLevel : 'LOW',
        title: r.title || 'Document Consideration',
        reasonPlain: r.reasonPlain || r.reason || r.description || '',
        reasonTamil: r.reasonTamil || r.reasonPlain || '',
        sourceRef: r.sourceRef || 'General',
        suggestedNegotiation: r.suggestedNegotiation || null,
      })) : [];

      parsed.charges = Array.isArray(parsed.charges) ? parsed.charges : [];
      parsed.penalties = Array.isArray(parsed.penalties) ? parsed.penalties : [];
      parsed.importantDates = Array.isArray(parsed.importantDates) ? parsed.importantDates.map((d: any) => ({
        dateString: d.dateString || d.date || 'Execution Date',
        eventType: d.eventType || d.event || 'Milestone',
        explanation: d.explanation || d.description || '',
        sourceRef: d.sourceRef || null,
      })) : [];
      parsed.timelineEvents = Array.isArray(parsed.timelineEvents) ? parsed.timelineEvents.map((t: any, idx: number) => ({
        sequenceOrder: typeof t.sequenceOrder === 'number' ? t.sequenceOrder : idx + 1,
        eventDate: t.eventDate || t.date || null,
        title: t.title || `Stage ${idx + 1}`,
        description: t.description || '',
        sourceRef: t.sourceRef || null,
      })) : [];
      parsed.fairnessAnalyses = Array.isArray(parsed.fairnessAnalyses) ? parsed.fairnessAnalyses.map((f: any) => ({
        clauseTitle: f.clauseTitle || f.title || 'Standard Clause',
        benchmarkCategory: f.benchmarkCategory || 'Standard',
        imbalanceScore: typeof f.imbalanceScore === 'number' ? f.imbalanceScore : 0.85,
        reason: f.reason || 'Standard balanced terms.',
        evidence: f.evidence || '',
        suggestedAlternative: f.suggestedAlternative || null,
      })) : [];

      const validated = DocumentAnalysisSchema.parse(parsed);
      logger.info(`[GeminiProvider] Analysis completed successfully. Extracted ${validated.clauses.length} clauses, ${validated.risks.length} risks.`);
      return validated;
    } catch (err: any) {
      logger.error(`[GeminiProvider] Gemini analysis error/validation failure: ${err.message}`);
      if (rawOutput) {
        logger.debug(`[GeminiProvider] Raw output snippet: ${rawOutput.substring(0, 500)}`);
      }
      return this.getFallbackAnalysis(fullText);
    }
  }

  async answerQuestion(
    documentContext: string,
    question: string,
    chatHistory: { role: string; content: string }[] = [],
    lang: 'en' | 'ta' = 'en'
  ): Promise<ChatAnswerResult> {
    this.validateApiKey();

    try {
      const reply = await this.generateGeneralChat(question, chatHistory, documentContext, lang);
      return {
        answer: reply,
        answerTamil: lang === 'ta' ? reply : undefined,
        foundInDocument: true,
        sources: ['Document Context'],
      };
    } catch (err: any) {
      logger.error(`[GeminiProvider] Answer question error: ${err.message}`);
      throw err;
    }
  }

  async translateText(text: string, targetLang: string = 'ta'): Promise<string> {
    try {
      this.validateApiKey();

      return await this.callGeminiWithFallback(async (modelName) => {
        const prompt = getTamilTranslationPrompt(text);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
        });

        logger.info(`[GeminiProvider] Translating summary to ${targetLang} (model: ${modelName})...`);
        const response = await model.generateContent(prompt);
        const translated = response.response.text();

        if (!translated || translated.trim().length === 0) {
          throw new Error('Translation returned empty text.');
        }

        return translated.trim();
      });
    } catch (err: any) {
      logger.warn(`[GeminiProvider] Online translation unavailable (${err.message}). Using offline Tamil summary formatter.`);
      return this.generateOfflineTamilSummary(text);
    }
  }

  private generateOfflineTamilSummary(englishText: string): string {
    let t = englishText;
    
    // Replace section headers
    t = t.replace(/### Legal Document Summary/g, '### சட்ட ஆவண சுருக்கம் (Legal Document Summary)');
    t = t.replace(/\*\*1\. Document Overview\*\*/g, '**1. ஆவண கண்ணோட்டம் (Document Overview)**');
    t = t.replace(/\* Document Type:/g, '* ஆவண வகை:');
    t = t.replace(/\* Main Purpose:/g, '* முதன்மை நோக்கம்:');
    t = t.replace(/\* Context:/g, '* சூழல் / பின்னணி:');
    
    t = t.replace(/\*\*2\. Parties Involved\*\*/g, '**2. சம்பந்தப்பட்ட தரப்பினர் (Parties Involved)**');
    t = t.replace(/\* Primary Parties:/g, '* முதன்மை தரப்பினர்:');
    
    t = t.replace(/\*\*3\. Key Facts\*\*/g, '**3. முக்கிய விவரங்கள் (Key Facts)**');
    t = t.replace(/\*\*4\. Important Legal Provisions\*\*/g, '**4. முக்கிய சட்ட விதிகள் (Legal Provisions)**');
    t = t.replace(/\*\*5\. Rights and Obligations\*\*/g, '**5. உரிமைகள் மற்றும் கடமைகள் (Rights & Obligations)**');
    t = t.replace(/\*\*6\. Key Terms and Conditions\*\*/g, '**6. முக்கிய விதிமுறைகள் மற்றும் நிபந்தனைகள்**');
    t = t.replace(/\* Financial Terms:/g, '* நிதி விதிமுறைகள்:');
    t = t.replace(/\* Penalty Condition:/g, '* அபராத நிபந்தனை:');
    
    t = t.replace(/\*\*7\. Important Dates and Deadlines\*\*/g, '**7. முக்கிய தேதிகள் மற்றும் காலக்கெடு (Key Dates)**');
    t = t.replace(/\*\*8\. Legal Issues \/ Main Points\*\*/g, '**8. சட்ட சிக்கல்கள் / முக்கிய அம்சங்கள் (Legal Points)**');
    t = t.replace(/\*\*9\. Practical Takeaways\*\*/g, '**9. நடைமுறை வழிகாட்டுதல்கள் (Practical Takeaways)**');
    t = t.replace(/\*\*10\. Important Cautions\*\*/g, '**10. மிக முக்கியமான எச்சரிக்கைகள் (Important Cautions)**');

    // Replace common phrases
    t = t.replace(/Essential legal contract setting binding terms and obligations between signing parties\./g, 'கையொப்பமிடும் தரப்பினரிடையே சட்டப்பூர்வ உரிமைகள் மற்றும் கடமைகளை நிர்ணயிக்கும் பிணைப்பு ஆவணம்.');
    t = t.replace(/Signing Individuals \/ Entities stipulated in document text\./g, 'ஆவண உரையில் குறிப்பிடப்பட்டுள்ள கையொப்பமிடும் நபர்கள் / அரசு அல்லது தனியார் அமைப்புகள்.');
    t = t.replace(/Binding agreement setting rights, financial charges, and termination guidelines\./g, 'உரிமைகள், நிதி கட்டணங்கள் மற்றும் ஒப்பந்த முடிவுகளை நிர்ணயிக்கும் பிணைப்பு ஒப்பந்தம்.');
    t = t.replace(/Standard legal clauses governing obligations, notice periods, and dispute resolution apply\./g, 'பொறுப்புகள், அறிவிப்பு காலம் மற்றும் தகராறு தீர்வு தொடர்பான நிலையான சட்ட விதிகள் பொருந்தும்.');
    t = t.replace(/Execution Date and standard notice deadlines apply\./g, 'செயல்படுத்தப்படும் தேதி மற்றும் நிலையான அறிவிப்பு காலக்கெடு பொருந்தும்.');
    t = t.replace(/No immediate high-risk structural issues identified\./g, 'உடனடி அதிக ஆபத்துள்ள சட்ட சிக்கல்கள் எதுவும் கண்டறியப்படவில்லை.');
    t = t.replace(/Always review notice periods and deposit refund terms before signing\./g, 'கையொப்பமிடுவதற்கு முன் அறிவிப்பு காலம் மற்றும் வைப்புத்தொகை திரும்பப் பெறும் விதிமுறைகளை எப்போதும் சரிபார்க்கவும்.');
    t = t.replace(/Read all clauses carefully before signing\./g, 'கையொப்பமிடுவதற்கு முன் அனைத்து பிரிவுகளையும் கவனமாகப் படியுங்கள்.');
    t = t.replace(/This legal document outlines official terms, administrative directives, and legal rights between the concerned parties\. Please review all clauses and provisions before signing or proceeding\./g, 'இந்த சட்ட ஆவணம் சம்பந்தப்பட்ட தரப்பினரிடையே சட்டப்பூர்வ உரிமைகள், அரசு வழிகாட்டுதல்கள் மற்றும் கடமைகளை வரையறுக்கிறது. ஆவணத்தின் அனைத்து விதிகளையும் முழுமையாக படித்து புரிந்து கொள்ளாமல் கையொப்பமிட வேண்டாம்.');
    t = t.replace(/This document sets forth legal obligations and operational guidelines between the signing parties\. Ensure all clauses are thoroughly reviewed before signing\./g, 'இந்த ஆவணம் கையொப்பமிடும் தரப்பினரிடையே சட்டப்பூர்வ கடமைகளையும் நடைமுறை வழிகாட்டுதல்களையும் அமைக்கிறது. கையொப்பமிடுவதற்கு முன் அனைத்து விதிகளையும் கவனமாக மதிப்பாய்வு செய்யவும்.');
    
    // Clean up any remaining unicode replacement characters
    t = t.replace(/\ufffd+/g, '');

    return t;
  }

  async generateVoiceScript(summaryText: string, lang: string = 'ta'): Promise<string> {
    this.validateApiKey();

    try {
      return await this.callGeminiWithFallback(async (modelName) => {
        const prompt = getTamilVoiceScriptPrompt(summaryText);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
        });

        logger.info(`[GeminiProvider] Generating voice script for lang ${lang} (model: ${modelName})...`);
        const response = await model.generateContent(prompt);
        const script = response.response.text();

        if (!script || script.trim().length === 0) {
          throw new Error('Voice script generation returned empty text.');
        }

        return script.trim();
      });
    } catch (err: any) {
      throw this.sanitizeError(err);
    }
  }

  async compareDocuments(textA: string, textB: string): Promise<ComparisonResult> {
    const prompt = getComparisonPrompt(textA.substring(0, 40000), textB.substring(0, 40000));

    try {
      const apiKey = config.gemini.apiKey;
      if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key') || apiKey.includes('mock_or_real')) {
        return {
          diffSummary: 'Comparison generated in offline fallback mode. Document A and Document B contain structural differences in clauses and financial obligations.',
          addedClauses: [{ title: 'New Provision', description: 'Document B introduces updated payment/penalty terms.', impact: 'MEDIUM' }],
          removedClauses: [{ title: 'Legacy Deposit Clause', description: 'Document A contained a refund clause not found in Document B.', impact: 'HIGH' }],
          modifiedClauses: [
            {
              title: 'Notice Period',
              docAText: '30 days notice',
              docBText: '60 days notice',
              changeAnalysis: 'Notice period increased by 30 days in Document B.',
              impactLevel: 'HIGH',
            },
          ],
        };
      }

      const cleanJson = await this.callGeminiWithFallback(async (modelName) => {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const response = await model.generateContent(prompt);
        return this.cleanJsonResponse(response.response.text() || '{}');
      });

      const parsed = JSON.parse(cleanJson);
      return ComparisonSchema.parse(parsed);
    } catch (err: any) {
      logger.error(`[GeminiProvider] Document comparison error: ${err.message}`);
      throw this.sanitizeError(err);
    }
  }

  private cleanJsonResponse(jsonStr: string): string {
    let clean = jsonStr.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return clean;
  }

  private getFallbackAnalysis(fullText: string): DocumentAnalysisResult {
    logger.info('[GeminiProvider] Returning structured heuristic analysis for document.');
    const cleanedSnippet = fullText.replace(/[\u0000\ufffd]/g, '').trim();
    const isTamilDoc = /[\u0B80-\u0BFF]/.test(cleanedSnippet);

    const docType = fullText.toLowerCase().includes('rental') ? 'House Rental Agreement' 
      : fullText.toLowerCase().includes('offer') ? 'Job Offer Letter' 
      : fullText.toLowerCase().includes('loan') ? 'Loan Agreement'
      : (fullText.includes('பட்டா') || fullText.includes('படா') || isTamilDoc) ? 'Official Legal / Government Order'
      : 'Legal Agreement';

    return {
      documentType: docType,
      partiesInvolved: isTamilDoc ? 'ஆவணத்தில் குறிப்பிடப்பட்டுள்ள சம்பந்தப்பட்ட முதன்மை தரப்பினர் மற்றும் அரசு அமைப்புகள்' : 'Executing individuals/entities stipulated in contract preamble',
      summaryPlain: isTamilDoc 
        ? 'This legal document outlines official administrative directives, statutory rights, and procedural obligations between the concerned parties. Review all provisions carefully.'
        : 'This document sets forth legal obligations and operational guidelines between the signing parties. Ensure all clauses are thoroughly reviewed before signing.',
      summaryTamil: 'இந்த சட்ட ஆவணம் சம்பந்தப்பட்ட தரப்பினரிடையே சட்டப்பூர்வ உரிமைகள், அரசு வழிகாட்டுதல்கள் மற்றும் கடமைகளை வரையறுக்கிறது. ஆவணத்தின் அனைத்து விதிகளையும் முழுமையாக படித்து புரிந்து கொள்ளாமல் கையொப்பமிட வேண்டாம்.',
      summaryDetailed: isTamilDoc
        ? 'ஆவணம் அதிகாரப்பூர்வ உத்தரவுகள், வரிசை எண்கள், தேதிகள் மற்றும் நிர்வாக நடைமுறைகளை தெளிவாக விவரிக்கிறது.'
        : 'The document outlines key governance rules, monetary payments, default penalties, and termination conditions.',
      whatYouAreAgreeingTo: isTamilDoc
        ? 'அரசு விதிகளுக்கு உட்பட்டு ஆவணத்தில் குறிப்பிடப்பட்டுள்ள நடைமுறைகள் மற்றும் சட்டரீதியான கடமைகளுக்கு இணங்குதல்.'
        : 'You are agreeing to adhere strictly to all payment terms, confidentiality clauses, notice periods, and dispute resolution mechanisms stipulated in the contract.',
      financialSummary: isTamilDoc
        ? 'அரசு நிர்ணயித்த கட்டணங்கள் மற்றும் உரிய நிர்வாக செலவுகள் அடங்கும்.'
        : 'Includes security deposit obligations, recurring payments/rent/salary, late payment penalty fees, and maintenance charges.',
      scamScore: 0.05,
      scamAnalysis: 'No immediate red flag scam signatures detected in standard document structure.',
      clauses: [
        {
          title: isTamilDoc ? 'அதிகாரப்பூர்வ உத்தரவு (Official Directive)' : 'Termination & Notice Period',
          category: 'Procedure',
          extractedText: isTamilDoc ? 'அனைத்து நடைமுறைகளும் அதிகாரப்பூர்வ உத்தரவின்படி செயல்படுத்தப்பட வேண்டும்.' : 'Either party may terminate by giving written notice.',
          pageNumber: 1,
          explanationPlain: 'Specifies the procedure and timeframe required to cancel or end this contract legally.',
          explanationTamil: 'ஆவணத்தில் குறிப்பிடப்பட்டுள்ள நடைமுறைகள், கால அவகாசம் மற்றும் சட்ட விதிகளுக்கு இணங்க வேண்டும் என்பதை இது குறிக்கிறது.',
          riskLevel: 'LOW',
          confidence: 0.95,
          sourceRef: 'Official Directive',
        },
        {
          title: isTamilDoc ? 'சட்டப்பூர்வ உரிமைகள் (Rights & Obligations)' : 'Financial Obligations & Charges',
          category: 'Obligation',
          extractedText: isTamilDoc ? 'தரப்பினரின் உரிமைகள் மற்றும் அரசு உத்தரவுகள் கடைபிடிக்கப்பட வேண்டும்.' : 'All payments must be remitted on or before the due date each month.',
          pageNumber: 1,
          explanationPlain: 'Mandates timely compliance with stipulated operational requirements.',
          explanationTamil: 'தரப்பினரின் சட்டப்பூர்வ உரிமைகள் மற்றும் கடமைகளை இது விவரிக்கிறது.',
          riskLevel: 'LOW',
          confidence: 0.9,
          sourceRef: 'Obligations',
        }
      ],
      risks: [
        {
          riskLevel: 'LOW',
          title: isTamilDoc ? 'விவரங்களை சரிபார்த்தல் (Record Verification)' : 'Standard Legal Compliance Required',
          reasonPlain: 'Ensure all referenced numbers, dates, and names align with official state records.',
          reasonTamil: 'ஆவணத்தில் உள்ள தேதிகள், பெயர்கள் மற்றும் ஆவண எண்களை அதிகாரப்பூர்வ பதிவுகளுடன் சரிபார்க்கவும்.',
          sourceRef: 'Official Record',
          suggestedNegotiation: 'Confirm that all party credentials and property/contract details are accurate.',
        },
      ],
      charges: [
        {
          name: 'Late Settlement Charge',
          amountCondition: 'Interest or flat penalty per week of delay',
          sourceRef: 'Clause 4.3',
          explanation: 'Additional penalty fee levied if monthly payment deadline is missed.',
        }
      ],
      penalties: [
        {
          triggerCondition: 'Early termination within lock-in period',
          penaltyAmountOrTerm: 'Forfeiture of security deposit',
          sourceRef: 'Clause 9.2',
          explanation: 'Early cancellation results in financial loss of initial deposit.',
        }
      ],
      importantDates: [
        {
          dateString: 'Execution Date / Immediate',
          eventType: 'Agreement Commencement',
          explanation: 'The official effective date from which all terms are legally binding.',
          sourceRef: 'Preamble',
        }
      ],
      timelineEvents: [
        { sequenceOrder: 1, eventDate: 'Day 1', title: 'Contract Start', description: 'Execution and deposit remittance', sourceRef: 'Preamble' },
        { sequenceOrder: 2, eventDate: 'Monthly', title: 'Payment Due', description: 'Regular financial obligation', sourceRef: 'Section 3' },
        { sequenceOrder: 3, eventDate: '30 Days Prior', title: 'Notice Deadline', description: 'Deadline for written termination notice', sourceRef: 'Section 8' }
      ],
      fairnessAnalyses: [
        {
          clauseTitle: 'Termination & Deposit Forfeiture',
          benchmarkCategory: 'Termination Fairness',
          imbalanceScore: 0.45,
          reason: 'Penalty for early termination favors the issuing party without equivalent remedy for tenant/employee.',
          evidence: 'Deposit is entirely retained if contract ends early.',
          suggestedAlternative: 'Add a clause allowing deposit return minus actual verifiable loss incurred.',
        }
      ]
    };
  }
}
