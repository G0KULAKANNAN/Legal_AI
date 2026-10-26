import { z } from 'zod';

export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const ClauseSchema = z.object({
  title: z.string(),
  category: z.string(),
  extractedText: z.string(),
  pageNumber: z.number().optional().nullable(),
  explanationPlain: z.string(),
  explanationTamil: z.string(),
  riskLevel: RiskLevelSchema,
  confidence: z.number().min(0).max(1).default(0.9),
  sourceRef: z.string().optional().nullable(),
});

export const RiskSchema = z.object({
  riskLevel: RiskLevelSchema,
  title: z.string(),
  reasonPlain: z.string(),
  reasonTamil: z.string(),
  sourceRef: z.string().optional().nullable(),
  suggestedNegotiation: z.string().optional().nullable(),
});

export const ChargeSchema = z.object({
  name: z.string(),
  amountCondition: z.string(),
  sourceRef: z.string().optional().nullable(),
  explanation: z.string(),
});

export const PenaltySchema = z.object({
  triggerCondition: z.string(),
  penaltyAmountOrTerm: z.string(),
  sourceRef: z.string().optional().nullable(),
  explanation: z.string(),
});

export const ImportantDateSchema = z.object({
  dateString: z.string(),
  eventType: z.string(),
  explanation: z.string(),
  sourceRef: z.string().optional().nullable(),
});

export const TimelineEventSchema = z.object({
  sequenceOrder: z.number(),
  eventDate: z.string().optional().nullable(),
  title: z.string(),
  description: z.string(),
  sourceRef: z.string().optional().nullable(),
});

export const FairnessAnalysisSchema = z.object({
  clauseTitle: z.string(),
  benchmarkCategory: z.string(),
  imbalanceScore: z.number().min(0).max(1), // 0 = very unfair/one-sided, 1 = very fair
  reason: z.string(),
  evidence: z.string(),
  suggestedAlternative: z.string().optional().nullable(),
});

export const DocumentAnalysisSchema = z.object({
  documentType: z.string(),
  partiesInvolved: z.string().optional().nullable(),
  summaryPlain: z.string(),
  summaryTamil: z.string(),
  summaryDetailed: z.string(),
  structuredSummary: z.string().optional().nullable(),
  structuredSummaryTamil: z.string().optional().nullable(),
  whatYouAreAgreeingTo: z.string(),
  financialSummary: z.string(),
  scamScore: z.number().min(0).max(1).default(0),
  scamAnalysis: z.string().optional().nullable(),
  clauses: z.array(ClauseSchema),
  risks: z.array(RiskSchema),
  charges: z.array(ChargeSchema),
  penalties: z.array(PenaltySchema),
  importantDates: z.array(ImportantDateSchema),
  timelineEvents: z.array(TimelineEventSchema),
  fairnessAnalyses: z.array(FairnessAnalysisSchema),
});

export type DocumentAnalysisResult = z.infer<typeof DocumentAnalysisSchema>;

export const ChatAnswerSchema = z.object({
  answer: z.string(),
  answerTamil: z.string().optional().nullable(),
  foundInDocument: z.boolean(),
  sources: z.array(z.string()).default([]),
});

export type ChatAnswerResult = z.infer<typeof ChatAnswerSchema>;

export const ComparisonSchema = z.object({
  diffSummary: z.string(),
  addedClauses: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.string(),
  })),
  removedClauses: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.string(),
  })),
  modifiedClauses: z.array(z.object({
    title: z.string(),
    docAText: z.string(),
    docBText: z.string(),
    changeAnalysis: z.string(),
    impactLevel: RiskLevelSchema,
  })),
});

export type ComparisonResult = z.infer<typeof ComparisonSchema>;
