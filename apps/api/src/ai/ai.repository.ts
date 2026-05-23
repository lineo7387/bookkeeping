import { Injectable } from '@nestjs/common';
import type { PaginatedItems } from '@bookkeeping/shared-types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toAiExtractionSummary, toAiTaskDetail, type AiExtractionRecord, type AiTaskRecord } from './ai.mapper';
import type {
  AiExtractionForConfirmation,
  AiExtractionSummary,
  AiTaskDetail,
  CreateAiExtractionData,
  TextParseContext,
} from './ai.types';

type AiTransactionClient = {
  aiExtraction: {
    updateMany(args: Prisma.AiExtractionUpdateManyArgs): Promise<Prisma.BatchPayload>;
    findFirst(args: Prisma.AiExtractionFindFirstArgs): Promise<AiExtractionRecord | null>;
  };
};

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  createTextParseTask(data: { ledgerId: string; userId: string; inputText: string }): Promise<AiTaskDetail> {
    return this.prisma.aiTask
      .create({
        data: {
          ledgerId: data.ledgerId,
          userId: data.userId,
          type: 'text_parse',
          status: 'processing',
          inputText: data.inputText,
        },
        include: { extractions: true },
      })
      .then((task) => toAiTaskDetail(task as AiTaskRecord));
  }

  async markTaskSucceeded(taskId: string): Promise<AiTaskDetail> {
    const task = await this.prisma.aiTask.update({
      where: { id: taskId },
      data: { status: 'succeeded', errorMessage: null },
      include: { extractions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return toAiTaskDetail(task as AiTaskRecord);
  }

  async markTaskFailed(taskId: string, errorMessage: string): Promise<AiTaskDetail> {
    const task = await this.prisma.aiTask.update({
      where: { id: taskId },
      data: { status: 'failed', errorMessage },
      include: { extractions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return toAiTaskDetail(task as AiTaskRecord);
  }

  async createExtraction(data: CreateAiExtractionData): Promise<AiExtractionSummary> {
    const extraction = await this.prisma.aiExtraction.create({
      data: {
        aiTaskId: data.aiTaskId,
        ledgerId: data.ledgerId,
        userId: data.userId,
        rawResult: data.rawResult as Prisma.InputJsonValue,
        suggestedTransaction: data.suggestedTransaction as unknown as Prisma.InputJsonValue,
        confidence: data.confidence.toFixed(4),
        status: 'pending',
      },
    });

    return toAiExtractionSummary(extraction as AiExtractionRecord);
  }

  async findTaskForUser(taskId: string, userId: string): Promise<AiTaskDetail | null> {
    const task = await this.prisma.aiTask.findFirst({
      where: { id: taskId, userId },
      include: { extractions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return task ? toAiTaskDetail(task as AiTaskRecord) : null;
  }

  async listTasksForLedgerUser(
    ledgerId: string,
    userId: string,
    query: { limit: number; offset: number },
  ): Promise<PaginatedItems<AiTaskDetail>> {
    const tasks = await this.prisma.aiTask.findMany({
      where: { ledgerId, userId },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      include: { extractions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return {
      items: tasks.map((task) => toAiTaskDetail(task as AiTaskRecord)),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async findPendingExtractionForUser(
    extractionId: string,
    userId: string,
  ): Promise<AiExtractionForConfirmation | null> {
    const extraction = await this.prisma.aiExtraction.findFirst({
      where: { id: extractionId, userId, status: 'pending' },
    });

    return extraction ? toAiExtractionForConfirmation(extraction as AiExtractionRecord) : null;
  }

  async confirmExtractionInTransaction(data: {
    tx: AiTransactionClient;
    extractionId: string;
    userId: string;
  }): Promise<AiExtractionSummary | null> {
    const result = await data.tx.aiExtraction.updateMany({
      where: {
        id: data.extractionId,
        userId: data.userId,
        status: 'pending',
      },
      data: { status: 'confirmed' },
    });

    if (result.count === 0) {
      return null;
    }

    const extraction = await data.tx.aiExtraction.findFirst({
      where: { id: data.extractionId, userId: data.userId },
    });

    return extraction ? toAiExtractionSummary(extraction) : null;
  }

  async rejectExtraction(extractionId: string, userId: string, _reason?: string): Promise<AiExtractionSummary | null> {
    const result = await this.prisma.aiExtraction.updateMany({
      where: { id: extractionId, userId, status: 'pending' },
      data: { status: 'rejected' },
    });

    if (result.count === 0) {
      return null;
    }

    const extraction = await this.prisma.aiExtraction.findFirst({
      where: { id: extractionId, userId },
    });

    return extraction ? toAiExtractionSummary(extraction as AiExtractionRecord) : null;
  }

  async getTextParseContext(ledgerId: string, userId: string): Promise<TextParseContext | null> {
    const ledger = await this.prisma.ledger.findFirst({
      where: { id: ledgerId, archivedAt: null },
      select: {
        timezone: true,
        defaultCurrency: true,
        categories: {
          where: { archivedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: { name: true },
        },
        accounts: {
          where: {
            archivedAt: null,
            OR: [{ visibility: 'ledger' }, { visibility: 'private', ownerId: userId }],
          },
          orderBy: { sortOrder: 'asc' },
          select: { name: true },
        },
      },
    });

    if (!ledger) {
      return null;
    }

    return {
      timezone: ledger.timezone,
      defaultCurrency: ledger.defaultCurrency,
      categoryNames: ledger.categories.map((category) => category.name),
      accountHints: ledger.accounts.map((account) => account.name),
    };
  }

  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}

function toAiExtractionForConfirmation(extraction: AiExtractionRecord): AiExtractionForConfirmation {
  return {
    ...toAiExtractionSummary(extraction),
    userId: extraction.userId,
    rawResult: extraction.rawResult,
  };
}
