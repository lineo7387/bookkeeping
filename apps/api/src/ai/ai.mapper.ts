import type { AiCandidateTransaction, AiExtractionSummary } from '@bookkeeping/shared-types';
import type { AiTaskDetail, AiTaskType } from './ai.types';

type DecimalLike = { toString(): string };

export type AiExtractionRecord = {
  id: string;
  aiTaskId: string;
  ledgerId: string;
  userId: string;
  rawResult: unknown;
  suggestedTransaction: unknown;
  confidence: DecimalLike;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
};

export type AiTaskRecord = {
  id: string;
  ledgerId: string;
  userId: string;
  type: AiTaskType;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  inputText: string | null;
  inputFileUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  extractions?: AiExtractionRecord[];
};

export function toAiTaskDetail(task: AiTaskRecord): AiTaskDetail {
  const extraction = task.extractions?.[0] ? toAiExtractionSummary(task.extractions[0]) : null;
  return {
    id: task.id,
    ledgerId: task.ledgerId,
    type: task.type,
    status: task.status,
    errorMessage: task.errorMessage,
    extraction,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toAiExtractionSummary(extraction: AiExtractionRecord): AiExtractionSummary {
  return {
    id: extraction.id,
    taskId: extraction.aiTaskId,
    ledgerId: extraction.ledgerId,
    status: extraction.status,
    candidate: extraction.suggestedTransaction as AiCandidateTransaction,
    confidence: Number(extraction.confidence.toString()),
    createdAt: extraction.createdAt.toISOString(),
    updatedAt: extraction.updatedAt.toISOString(),
  };
}
