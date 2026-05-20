import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { TransactionSummary } from '@bookkeeping/shared-types';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';
import type { AiCandidateTransaction, AiExtractionSummary, AiTaskDetail } from './ai.types';

describe('AiService', () => {
  let repository: jest.Mocked<
    Pick<
      AiRepository,
      | 'createTextParseTask'
      | 'markTaskSucceeded'
      | 'markTaskFailed'
      | 'createExtraction'
      | 'findTaskForUser'
      | 'listTasksForLedgerUser'
      | 'findPendingExtractionForUser'
      | 'confirmExtractionInTransaction'
      | 'rejectExtraction'
      | 'getTextParseContext'
    >
  > & { runInTransaction: jest.Mock };
  let policy: jest.Mocked<Pick<LedgerPolicyService, 'canCreateTransaction' | 'canViewLedger'>>;
  let internalClient: jest.Mocked<Pick<AiInternalClient, 'parseTextTransaction'>>;
  let transactionsService: jest.Mocked<Pick<TransactionsService, 'createFromAiExtraction'>>;
  let service: AiService;

  const candidate: AiCandidateTransaction & { type: 'expense' } = {
    ledgerId: 'ledger_1',
    type: 'expense',
    amount: '86.00',
    currency: 'CNY',
    occurredAt: '2026-05-19T11:00:00.000Z',
    visibility: 'ledger',
    categoryName: '餐饮',
    accountHint: '微信',
    merchant: null,
    note: '晚饭',
    confidence: 0.91,
  };

  const extraction: AiExtractionSummary = {
    id: 'extraction_1',
    taskId: 'task_1',
    ledgerId: 'ledger_1',
    status: 'pending',
    candidate,
    confidence: 0.91,
    createdAt: '2026-05-19T11:00:00.000Z',
    updatedAt: '2026-05-19T11:00:00.000Z',
  };

  const task: AiTaskDetail = {
    id: 'task_1',
    ledgerId: 'ledger_1',
    type: 'text_parse',
    status: 'processing',
    errorMessage: null,
    extraction: null,
    createdAt: '2026-05-19T11:00:00.000Z',
    updatedAt: '2026-05-19T11:00:00.000Z',
  };

  const transaction: TransactionSummary = {
    id: 'transaction_1',
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense',
    amount: '86.00',
    currency: 'CNY',
    occurredAt: '2026-05-19T11:00:00.000Z',
    merchant: null,
    note: '晚饭',
    visibility: 'ledger',
    createdBy: 'user_1',
    source: 'ai_text',
    metadata: null,
    createdAt: '2026-05-19T11:01:00.000Z',
    updatedAt: '2026-05-19T11:01:00.000Z',
  };

  beforeEach(() => {
    repository = {
      createTextParseTask: jest.fn(),
      markTaskSucceeded: jest.fn(),
      markTaskFailed: jest.fn(),
      createExtraction: jest.fn(),
      findTaskForUser: jest.fn(),
      listTasksForLedgerUser: jest.fn(),
      findPendingExtractionForUser: jest.fn(),
      confirmExtractionInTransaction: jest.fn(),
      rejectExtraction: jest.fn(),
      getTextParseContext: jest.fn(),
      runInTransaction: jest.fn(async (callback) => callback({} as never)),
    };
    policy = {
      canCreateTransaction: jest.fn(),
      canViewLedger: jest.fn(),
    };
    internalClient = {
      parseTextTransaction: jest.fn(),
    };
    transactionsService = {
      createFromAiExtraction: jest.fn(),
    };
    service = new AiService(
      repository as unknown as AiRepository,
      policy as unknown as LedgerPolicyService,
      internalClient as unknown as AiInternalClient,
      transactionsService as unknown as TransactionsService,
    );
  });

  it('creates a task and extraction but does not create a transaction during text parse', async () => {
    policy.canCreateTransaction.mockResolvedValue(true);
    repository.createTextParseTask.mockResolvedValue(task);
    repository.getTextParseContext.mockResolvedValue({
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
      categoryNames: ['餐饮'],
      accountHints: ['微信'],
    });
    internalClient.parseTextTransaction.mockResolvedValue({
      status: 'succeeded',
      candidate,
      confidence: 0.91,
      rawResult: { provider: 'deterministic' },
    });
    repository.createExtraction.mockResolvedValue(extraction);
    repository.markTaskSucceeded.mockResolvedValue({ ...task, status: 'succeeded', extraction });

    await expect(
      service.parseAiText('user_1', 'ledger_1', {
        inputText: '今天晚饭花了86，微信支付',
        locale: 'zh-CN',
      }),
    ).resolves.toMatchObject({
      taskId: 'task_1',
      ledgerId: 'ledger_1',
      status: 'succeeded',
      extraction: { id: 'extraction_1' },
    });

    expect(policy.canCreateTransaction).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.createExtraction).toHaveBeenCalledWith(
      expect.objectContaining({
        aiTaskId: 'task_1',
        ledgerId: 'ledger_1',
        userId: 'user_1',
        suggestedTransaction: candidate,
      }),
    );
    expect(transactionsService.createFromAiExtraction).not.toHaveBeenCalled();
  });

  it('marks the task failed when the internal AI client throws', async () => {
    policy.canCreateTransaction.mockResolvedValue(true);
    repository.createTextParseTask.mockResolvedValue(task);
    repository.getTextParseContext.mockResolvedValue({
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
      categoryNames: [],
      accountHints: [],
    });
    internalClient.parseTextTransaction.mockRejectedValue(new Error('AI service unavailable'));
    repository.markTaskFailed.mockResolvedValue({ ...task, status: 'failed', errorMessage: 'AI task failed' });

    await expect(
      service.parseAiText('user_1', 'ledger_1', { inputText: '今天晚饭花了86' }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'AI_TASK_FAILED' } },
    });
    expect(repository.markTaskFailed).toHaveBeenCalledWith('task_1', 'AI task failed');
  });

  it('confirms a pending extraction by creating source ai_text transaction', async () => {
    repository.findPendingExtractionForUser.mockResolvedValue({
      ...extraction,
      userId: 'user_1',
      rawResult: { provider: 'deterministic' },
    });
    transactionsService.createFromAiExtraction.mockResolvedValue(transaction);
    repository.confirmExtractionInTransaction.mockResolvedValue({ ...extraction, status: 'confirmed' });

    await expect(
      service.confirmExtraction('user_1', 'extraction_1', {
        ledgerId: 'ledger_1',
        accountId: 'account_1',
        categoryId: 'category_1',
      }),
    ).resolves.toMatchObject({
      ledgerId: 'ledger_1',
      transactionId: 'transaction_1',
      extraction: { status: 'confirmed' },
    });

    expect(transactionsService.createFromAiExtraction).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({
        ledgerId: 'ledger_1',
        sourceExtractionId: 'extraction_1',
      }),
      expect.anything(),
    );
  });

  it('rejects a pending extraction without creating a transaction', async () => {
    repository.rejectExtraction.mockResolvedValue({ ...extraction, status: 'rejected' });

    await expect(
      service.rejectExtraction('user_1', 'extraction_1', { reason: '金额不准确' }),
    ).resolves.toMatchObject({ id: 'extraction_1', status: 'rejected' });

    expect(repository.rejectExtraction).toHaveBeenCalledWith('extraction_1', 'user_1', '金额不准确');
    expect(transactionsService.createFromAiExtraction).not.toHaveBeenCalled();
  });

  it('does not allow non-creator access to an extraction', async () => {
    repository.findPendingExtractionForUser.mockResolvedValue(null);

    await expect(
      service.confirmExtraction('user_2', 'extraction_1', { ledgerId: 'ledger_1' }),
    ).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });

    expect(transactionsService.createFromAiExtraction).not.toHaveBeenCalled();
  });

  it('denies parse when the user cannot create transactions in the ledger', async () => {
    policy.canCreateTransaction.mockResolvedValue(false);

    await expect(
      service.parseAiText('viewer_1', 'ledger_1', { inputText: '今天晚饭花了86' }),
    ).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(repository.createTextParseTask).not.toHaveBeenCalled();
  });
});
