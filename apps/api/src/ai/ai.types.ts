import type {
  AiCandidateTransaction,
  AiExtractionStatus,
  AiExtractionSummary,
  AiTaskStatus,
  PaginatedItems,
  TransactionSummary,
} from '@bookkeeping/shared-types';

export type AiTaskType = 'text_parse' | 'receipt_ocr' | 'classify' | 'insight';

export interface AiTaskDetail {
  id: string;
  ledgerId: string;
  type: AiTaskType;
  status: AiTaskStatus;
  errorMessage: string | null;
  extraction: AiExtractionSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiTextParseResult {
  taskId: string;
  ledgerId: string;
  status: AiTaskStatus;
  extraction: AiExtractionSummary | null;
}

export interface TextParseContext {
  timezone: string;
  defaultCurrency: string;
  categoryNames: string[];
  accountHints: string[];
}

export interface CreateAiExtractionData {
  aiTaskId: string;
  ledgerId: string;
  userId: string;
  rawResult: Record<string, unknown>;
  suggestedTransaction: AiCandidateTransaction;
  confidence: number;
}

export interface InternalAiTextCandidate {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  currency: string;
  occurredAt: string;
  categoryName: string | null;
  accountHint: string | null;
  merchant: string | null;
  note: string | null;
  confidence: number;
}

export interface InternalAiTextResult {
  status: 'succeeded' | 'failed';
  candidate: InternalAiTextCandidate | null;
  confidence?: number;
  rawResult: Record<string, unknown> | null;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
}

export interface AiExtractionForConfirmation extends AiExtractionSummary {
  userId: string;
  rawResult: unknown;
}

export interface ConfirmAiExtractionResult {
  ledgerId: string;
  transactionId: string;
  extraction: AiExtractionSummary;
  transaction: TransactionSummary;
}

export type AiTaskList = PaginatedItems<AiTaskDetail>;

export type { AiCandidateTransaction, AiExtractionStatus, AiExtractionSummary, AiTaskStatus };
