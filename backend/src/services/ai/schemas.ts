import { z } from 'zod';

export const RiskLevelSchema = z.preprocess((val) => {
  const str = String(val || '').toUpperCase();
  if (['HIGH', 'CRITICAL', 'SEVERE'].includes(str)) return 'HIGH';
  if (['MEDIUM', 'MODERATE', 'MED'].includes(str)) return 'MEDIUM';
  return 'LOW';
}, z.enum(['LOW', 'MEDIUM', 'HIGH']));

const ScoreSchema = z.preprocess((val) => {
  const num = Number(val);
  if (isNaN(num)) return 0.05;
  if (num > 1) return Math.min(1, Math.max(0, num / 100));
  return Math.min(1, Math.max(0, num));
}, z.number());

const FlexibleString = z.preprocess((val) => {
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  }
  if (typeof val === 'object') {
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('; ');
  }
  return String(val);
}, z.string());

const OptionalFlexibleString = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return null;
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  }
  if (typeof val === 'object') {
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('; ');
  }
  return String(val);
}, z.string().nullable().optional());

export const ClauseSchema = z.object({
  title: FlexibleString,
  category: FlexibleString,
  extractedText: FlexibleString,
  pageNumber: z.number().optional().nullable(),
  explanationPlain: FlexibleString,
  explanationTamil: FlexibleString,
  riskLevel: RiskLevelSchema,
  confidence: ScoreSchema.default(0.9),
  sourceRef: OptionalFlexibleString,
});

export const RiskSchema = z.object({
  riskLevel: RiskLevelSchema,
  title: FlexibleString,
  reasonPlain: FlexibleString,
  reasonTamil: FlexibleString,
  sourceRef: OptionalFlexibleString,
  suggestedNegotiation: OptionalFlexibleString,
});

export const ChargeSchema = z.object({
  name: FlexibleString,
  amountCondition: FlexibleString,
  sourceRef: OptionalFlexibleString,
  explanation: FlexibleString,
});

export const PenaltySchema = z.object({
  triggerCondition: FlexibleString,
  penaltyAmountOrTerm: FlexibleString,
  sourceRef: OptionalFlexibleString,
  explanation: FlexibleString,
});

export const ImportantDateSchema = z.object({
  dateString: FlexibleString,
  eventType: FlexibleString,
  explanation: FlexibleString,
  sourceRef: OptionalFlexibleString,
});

export const TimelineEventSchema = z.object({
  sequenceOrder: z.preprocess((v) => Number(v) || 1, z.number()),
  eventDate: OptionalFlexibleString,
  title: FlexibleString,
  description: FlexibleString,
  sourceRef: OptionalFlexibleString,
});

export const FairnessAnalysisSchema = z.object({
  clauseTitle: FlexibleString,
  benchmarkCategory: FlexibleString,
  imbalanceScore: ScoreSchema, // 0 = very unfair/one-sided, 1 = very fair
  reason: FlexibleString,
  evidence: FlexibleString,
  suggestedAlternative: OptionalFlexibleString,
});

export const DocumentAnalysisSchema = z.object({
  documentType: FlexibleString,
  partiesInvolved: OptionalFlexibleString,
  summaryPlain: FlexibleString,
  summaryTamil: FlexibleString,
  summaryDetailed: FlexibleString,
  structuredSummary: OptionalFlexibleString,
  structuredSummaryTamil: OptionalFlexibleString,
  whatYouAreAgreeingTo: FlexibleString,
  financialSummary: FlexibleString,
  scamScore: ScoreSchema.default(0.05),
  scamAnalysis: OptionalFlexibleString,
  clauses: z.array(ClauseSchema).default([]),
  risks: z.array(RiskSchema).default([]),
  charges: z.array(ChargeSchema).default([]),
  penalties: z.array(PenaltySchema).default([]),
  importantDates: z.array(ImportantDateSchema).default([]),
  timelineEvents: z.array(TimelineEventSchema).default([]),
  fairnessAnalyses: z.array(FairnessAnalysisSchema).default([]),
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
