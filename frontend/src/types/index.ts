export type Role = 'USER' | 'ADMIN';

export type SubscriptionPlan = 'PREMIUM' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'NONE';

export interface UserSubscription {
  id?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number;
  amountFormatted?: string;
  currency: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  documentsAnalyzedThisMonth?: number;
}

export interface SubscriptionStatusResponse {
  hasActiveSubscription: boolean;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
  isAdminBypass?: boolean;
  usage?: {
    used: number;
    limit: number;
    resetsAt: string | null;
  };
  subscription?: UserSubscription | null;
}

export type DocumentStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'STORED'
  | 'EXTRACTING'
  | 'OCR'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  preferredLanguage: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  subscription?: UserSubscription | null;
  _count?: {
    documents?: number;
  };
}

export interface ReportedIssue {
  id: string;
  userId: string;
  issue: string;
  category: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface AdminDocumentMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  detectedType?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Clause {
  id: string;
  title: string;
  category: string;
  extractedText: string;
  pageNumber?: number | null;
  explanationPlain: string;
  explanationTamil: string;
  riskLevel: RiskLevel;
  confidence: number;
  sourceRef?: string | null;
}

export interface Risk {
  id: string;
  riskLevel: RiskLevel;
  title: string;
  reasonPlain: string;
  reasonTamil: string;
  sourceRef?: string | null;
  suggestedNegotiation?: string | null;
}

export interface Charge {
  id: string;
  name: string;
  amountCondition: string;
  sourceRef?: string | null;
  explanation: string;
}

export interface Penalty {
  id: string;
  triggerCondition: string;
  penaltyAmountOrTerm: string;
  sourceRef?: string | null;
  explanation: string;
}

export interface ImportantDate {
  id: string;
  dateString: string;
  eventType: string;
  explanation: string;
  sourceRef?: string | null;
  isReminderCreated?: boolean;
}

export interface TimelineEvent {
  id: string;
  sequenceOrder: number;
  eventDate?: string | null;
  title: string;
  description: string;
  sourceRef?: string | null;
}

export interface FairnessAnalysis {
  id: string;
  clauseTitle: string;
  benchmarkCategory: string;
  imbalanceScore: number; // 0 to 1
  reason: string;
  evidence: string;
  suggestedAlternative?: string | null;
}

export interface Analysis {
  id: string;
  documentId: string;
  documentType: string;
  partiesInvolved?: string | null;
  summaryPlain: string;
  summaryTamil: string;
  summaryDetailed: string;
  structuredSummary?: string | null;
  structuredSummaryTamil?: string | null;
  whatYouAreAgreeingTo: string;
  financialSummary: string;
  scamScore: number;
  scamAnalysis?: string | null;
  clauses: Clause[];
  risks: Risk[];
  charges: Charge[];
  penalties: Penalty[];
  importantDates: ImportantDate[];
  timelineEvents: TimelineEvent[];
  fairnessAnalyses: FairnessAnalysis[];
  _count?: {
    risks?: number;
    clauses?: number;
    charges?: number;
  };
  createdAt: string;
}

export interface LegalDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  processingError?: string | null;
  detectedType?: string | null;
  analysis?: Analysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[] | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  status: 'PENDING' | 'NOTIFIED' | 'DISMISSED';
  notes?: string | null;
  document?: {
    id: string;
    originalName: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
