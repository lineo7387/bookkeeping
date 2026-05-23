import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { StorageService } from '../storage/storage.service';
import { AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import { OCR_QUEUE_NAME, type OcrJobData } from './ocr-queue.constants';
import type { AiCandidateTransaction } from './ai.types';

@Injectable()
@Processor(OCR_QUEUE_NAME, { concurrency: 2 })
export class OcrQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrQueueProcessor.name);

  constructor(
    private readonly aiRepository: AiRepository,
    private readonly aiInternalClient: AiInternalClient,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<OcrJobData>): Promise<void> {
    const { taskId, ledgerId, userId, storageKey, mimeType } = job.data;
    this.logger.log(`Processing OCR job for task ${taskId}`);

    await this.aiRepository.markTaskProcessing(taskId);

    try {
      const signedUrl = await this.storageService.getSignedUrl('bookkeeping-receipts', storageKey);
      const context = await this.aiRepository.getTextParseContext(ledgerId, userId);

      if (!context) {
        await this.aiRepository.markTaskFailed(taskId, 'Ledger context not found');
        throw new Error('Ledger context not found');
      }

      const result = await this.aiInternalClient.parseReceiptOcr({
        taskId,
        ledgerId,
        userId,
        signedUrl,
        storageKey,
        mimeType,
        locale: 'zh-CN',
        timezone: context.timezone,
        defaultCurrency: context.defaultCurrency,
        context,
      });

      if (result.status === 'failed' || !result.candidate) {
        const errorMsg = result.error?.message ?? 'OCR processing failed';
        await this.aiRepository.markTaskFailed(taskId, errorMsg);
        throw new Error(errorMsg);
      }

      const candidate: AiCandidateTransaction = {
        ledgerId,
        type: result.candidate.type,
        amount: result.candidate.amount,
        currency: result.candidate.currency,
        occurredAt: result.candidate.occurredAt,
        visibility: 'ledger',
        categoryName: result.candidate.categoryName,
        accountHint: result.candidate.accountHint,
        merchant: result.candidate.merchant,
        note: result.candidate.note,
        confidence: result.candidate.confidence,
        missingFields: result.candidate.missingFields,
        reviewMessage: result.candidate.reviewMessage,
        receipt: result.candidate.receipt ?? undefined,
      };

      await this.aiRepository.createExtraction({
        aiTaskId: taskId,
        ledgerId,
        userId,
        rawResult: (result.rawResult as Record<string, unknown>) ?? { provider: 'unknown' },
        suggestedTransaction: candidate,
        confidence: result.candidate.confidence,
      });

      await this.aiRepository.markTaskSucceeded(taskId);
      this.logger.log(`OCR job completed for task ${taskId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OCR error';
      this.logger.error(`OCR job failed for task ${taskId}: ${message}`);
      await this.aiRepository.markTaskFailed(taskId, message).catch(() => {});
      throw error;
    }
  }
}
