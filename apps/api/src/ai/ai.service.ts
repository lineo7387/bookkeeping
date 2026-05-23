import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { type TransactionClient } from '../transactions/transactions.repository';
import { TransactionsService } from '../transactions/transactions.service';
import { AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import type { ConfirmAiExtractionDto } from './dto/confirm-ai-extraction.dto';
import type { ListAiTasksQueryDto } from './dto/list-ai-tasks-query.dto';
import type { ParseAiTextDto } from './dto/parse-ai-text.dto';
import type { RejectAiExtractionDto } from './dto/reject-ai-extraction.dto';
import type {
  AiCandidateTransaction,
  AiExtractionSummary,
  AiTaskDetail,
  AiTaskList,
  AiTextParseResult,
  ConfirmAiExtractionResult,
  InternalAiTextCandidate,
  InternalAiTextResult,
  TextParseContext,
} from './ai.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service';
import { OCR_QUEUE_NAME, OCR_JOB_NAME, type OcrJobData } from './ocr-queue.constants';
import { mimeToExtension } from './dto/receipt-ocr-file.filter';
import type { ReceiptOcrAcceptedResult } from '@bookkeeping/shared-types';

@Injectable()
export class AiService {
  constructor(
    private readonly aiRepository: AiRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
    private readonly aiInternalClient: AiInternalClient,
    private readonly transactionsService: TransactionsService,
    private readonly storageService: StorageService,
    @InjectQueue(OCR_QUEUE_NAME) private readonly ocrQueue: Queue<OcrJobData>,
  ) {}

  async submitReceiptOcr(
    userId: string,
    ledgerId: string,
    file: Express.Multer.File,
  ): Promise<ReceiptOcrAcceptedResult> {
    await this.requireCreateTransaction(userId, ledgerId);

    const now = new Date();
    const ext = mimeToExtension(file.mimetype);
    const storageKey = `receipts/${ledgerId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;
    const bucket = this.storageService.getReceiptBucketName();

    await this.storageService.upload(bucket, storageKey, file.buffer, file.mimetype);

    const task = await this.aiRepository.createReceiptOcrTask({
      ledgerId,
      userId,
      inputFileUrl: storageKey,
    });

    await this.ocrQueue.add(OCR_JOB_NAME, {
      taskId: task.id,
      ledgerId,
      userId,
      storageKey,
      mimeType: file.mimetype,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    return {
      taskId: task.id,
      ledgerId,
      status: 'pending',
      type: 'receipt_ocr',
    };
  }

  async parseAiText(userId: string, ledgerId: string, dto: ParseAiTextDto): Promise<AiTextParseResult> {
    await this.requireCreateTransaction(userId, ledgerId);

    const task = await this.aiRepository.createTextParseTask({
      ledgerId,
      userId,
      inputText: dto.inputText,
    });
    const context = await this.aiRepository.getTextParseContext(ledgerId, userId);
    if (!context) {
      await this.aiRepository.markTaskFailed(task.id, 'Ledger context not found');
      throw new NotFoundException(fail('LEDGER_NOT_FOUND', 'Ledger not found'));
    }

    let result: InternalAiTextResult;
    try {
      result = await this.aiInternalClient.parseTextTransaction({
        taskId: task.id,
        ledgerId,
        userId,
        inputText: dto.inputText,
        locale: dto.locale ?? 'zh-CN',
        timezone: dto.timezone ?? context.timezone,
        defaultCurrency: dto.defaultCurrency ?? context.defaultCurrency,
        context: withDtoDefaults(context, dto),
      });
    } catch {
      await this.aiRepository.markTaskFailed(task.id, 'AI task failed');
      throw aiTaskFailed();
    }

    if (result.status === 'failed' || !result.candidate) {
      await this.aiRepository.markTaskFailed(task.id, result.error?.message ?? 'AI task failed');
      throw aiTaskFailed();
    }

    const candidate = toCandidate(ledgerId, result.candidate);
    const extraction = await this.aiRepository.createExtraction({
      aiTaskId: task.id,
      ledgerId,
      userId,
      rawResult: result.rawResult ?? { provider: 'unknown' },
      suggestedTransaction: candidate,
      confidence: result.confidence ?? candidate.confidence,
    });
    const succeededTask = await this.aiRepository.markTaskSucceeded(task.id);

    return {
      taskId: succeededTask.id,
      ledgerId: succeededTask.ledgerId,
      status: succeededTask.status,
      extraction,
    };
  }

  async listLedgerTasks(userId: string, ledgerId: string, query: ListAiTasksQueryDto = {}): Promise<AiTaskList> {
    await this.requireViewLedger(userId, ledgerId);
    return this.aiRepository.listTasksForLedgerUser(ledgerId, userId, normalizeQuery(query));
  }

  async getTask(userId: string, taskId: string): Promise<AiTaskDetail> {
    const task = await this.aiRepository.findTaskForUser(taskId, userId);
    if (!task) {
      throw aiResourceNotFound();
    }
    return task;
  }

  async confirmExtraction(
    userId: string,
    extractionId: string,
    dto: ConfirmAiExtractionDto,
  ): Promise<ConfirmAiExtractionResult> {
    const extraction = await this.aiRepository.findPendingExtractionForUser(extractionId, userId);
    if (!extraction || extraction.ledgerId !== dto.ledgerId) {
      throw aiResourceNotFound();
    }

    const task = await this.aiRepository.findRawTask(extraction.taskId);
    const transactionInput = buildTransactionInput(extraction, dto, task?.type === 'receipt_ocr' ? 'ocr' : 'ai_text');
    return this.aiRepository.runInTransaction(async (tx) => {
      const transaction = await this.transactionsService.createFromAiExtraction(
        userId,
        transactionInput,
        tx as unknown as TransactionClient,
      );
      const confirmed = await this.aiRepository.confirmExtractionInTransaction({
        tx,
        extractionId,
        userId,
      });
      if (!confirmed) {
        throw aiResourceNotFound();
      }

      // M5: Create attachment for OCR tasks
      const confirmedTask = await this.aiRepository.findTaskById(confirmed.taskId);
      if (confirmedTask && confirmedTask.type === 'receipt_ocr' && confirmedTask.extraction) {
        const aiTask = task?.type === 'receipt_ocr' ? task : await this.aiRepository.findRawTask(confirmed.taskId);
        if (aiTask?.inputFileUrl) {
          const extension = aiTask.inputFileUrl.split('.').pop() ?? '';
          await this.aiRepository.createTransactionAttachment(tx as any, {
            transactionId: transaction.id,
            fileUrl: aiTask.inputFileUrl,
            fileType: extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`,
            storageKey: aiTask.inputFileUrl,
          });
        }
      }

      return {
        ledgerId: confirmed.ledgerId,
        transactionId: transaction.id,
        extraction: confirmed,
        transaction,
      };
    });
  }

  async rejectExtraction(
    userId: string,
    extractionId: string,
    dto: RejectAiExtractionDto = {},
  ): Promise<AiExtractionSummary> {
    const extraction = await this.aiRepository.rejectExtraction(extractionId, userId, dto.reason);
    if (!extraction) {
      throw aiResourceNotFound();
    }
    return extraction;
  }

  private async requireCreateTransaction(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canCreateTransaction(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'));
    }
  }

  private async requireViewLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
    }
  }
}

function withDtoDefaults(context: TextParseContext, dto: ParseAiTextDto): TextParseContext {
  return {
    ...context,
    timezone: dto.timezone ?? context.timezone,
    defaultCurrency: dto.defaultCurrency ?? context.defaultCurrency,
  };
}

function toCandidate(ledgerId: string, candidate: InternalAiTextCandidate): AiCandidateTransaction {
  return {
    ledgerId,
    type: candidate.type,
    amount: candidate.amount,
    currency: candidate.currency,
    occurredAt: candidate.occurredAt,
    visibility: 'ledger',
    categoryName: candidate.categoryName,
    accountHint: candidate.accountHint,
    merchant: candidate.merchant,
    note: candidate.note,
    confidence: candidate.confidence,
    missingFields: candidate.missingFields,
    reviewMessage: candidate.reviewMessage,
  };
}

function buildTransactionInput(
  extraction: AiExtractionSummary,
  dto: ConfirmAiExtractionDto,
  source: 'ai_text' | 'ocr' = 'ai_text',
) {
  const candidate = extraction.candidate;
  if (!dto.accountId) {
    throw validationFailed('Account is required to confirm AI extraction');
  }
  if (candidate.type !== 'transfer' && !dto.categoryId) {
    throw validationFailed('Category is required to confirm AI extraction');
  }

  return {
    ledgerId: extraction.ledgerId,
    accountId: dto.accountId,
    categoryId: dto.categoryId ?? null,
    type: candidate.type,
    amount: dto.amount ?? candidate.amount,
    currency: candidate.currency,
    occurredAt: dto.occurredAt ?? candidate.occurredAt,
    merchant: candidate.merchant,
    note: dto.note ?? candidate.note,
    visibility: dto.visibility ?? (candidate.visibility === 'private' ? 'private' : 'ledger'),
    sourceExtractionId: extraction.id,
    source,
  };
}

function normalizeQuery(query: ListAiTasksQueryDto): { limit: number; offset: number } {
  return {
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
  };
}

function aiTaskFailed(): BadRequestException {
  return new BadRequestException(fail('AI_TASK_FAILED', 'AI task failed'));
}

function aiResourceNotFound(): NotFoundException {
  return new NotFoundException(fail('VALIDATION_FAILED', 'AI resource not found'));
}

function validationFailed(message: string): BadRequestException {
  return new BadRequestException(fail('VALIDATION_FAILED', message));
}
