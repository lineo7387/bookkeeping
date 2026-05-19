import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let aiService: jest.Mocked<
    Pick<AiService, 'parseAiText' | 'listLedgerTasks' | 'getTask' | 'confirmExtraction' | 'rejectExtraction'>
  >;
  let controller: AiController;

  const extraction = {
    id: 'extraction_1',
    taskId: 'task_1',
    ledgerId: 'ledger_1',
    status: 'pending' as const,
    candidate: {
      ledgerId: 'ledger_1',
      type: 'expense' as const,
      amount: '86.00',
      currency: 'CNY',
      occurredAt: '2026-05-19T11:00:00.000Z',
      visibility: 'ledger' as const,
      categoryName: '餐饮',
      accountHint: '微信',
      merchant: null,
      note: '晚饭',
      confidence: 0.91,
    },
    confidence: 0.91,
    createdAt: '2026-05-19T11:00:00.000Z',
    updatedAt: '2026-05-19T11:00:00.000Z',
  };

  beforeEach(() => {
    aiService = {
      parseAiText: jest.fn(),
      listLedgerTasks: jest.fn(),
      getTask: jest.fn(),
      confirmExtraction: jest.fn(),
      rejectExtraction: jest.fn(),
    };
    controller = new AiController(aiService as unknown as AiService);
  });

  it('wraps parseAiText result in ApiResponse success', async () => {
    aiService.parseAiText.mockResolvedValue({
      taskId: 'task_1',
      ledgerId: 'ledger_1',
      status: 'succeeded',
      extraction,
    });

    await expect(
      controller.parseText(
        { id: 'user_1', email: 'lineo@example.com' },
        'ledger_1',
        { inputText: '今天晚饭花了86' },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: { taskId: 'task_1', extraction: { id: 'extraction_1' } },
    });
  });

  it('passes req.user.id into service methods', async () => {
    aiService.listLedgerTasks.mockResolvedValue({ items: [], limit: 20, offset: 0 });
    aiService.getTask.mockResolvedValue({
      id: 'task_1',
      ledgerId: 'ledger_1',
      type: 'text_parse',
      status: 'succeeded',
      errorMessage: null,
      extraction,
      createdAt: '2026-05-19T11:00:00.000Z',
      updatedAt: '2026-05-19T11:01:00.000Z',
    });

    await controller.listTasks({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1', { limit: 20 });
    await controller.getTask({ id: 'user_1', email: 'lineo@example.com' }, 'task_1');

    expect(aiService.listLedgerTasks).toHaveBeenCalledWith('user_1', 'ledger_1', { limit: 20 });
    expect(aiService.getTask).toHaveBeenCalledWith('user_1', 'task_1');
  });

  it('exposes confirm and reject extraction routes', async () => {
    aiService.confirmExtraction.mockResolvedValue({
      ledgerId: 'ledger_1',
      transactionId: 'transaction_1',
      extraction: { ...extraction, status: 'confirmed' },
      transaction: {
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
      },
    });
    aiService.rejectExtraction.mockResolvedValue({ ...extraction, status: 'rejected' });

    await expect(
      controller.confirmExtraction(
        { id: 'user_1', email: 'lineo@example.com' },
        'extraction_1',
        { ledgerId: 'ledger_1', accountId: 'account_1', categoryId: 'category_1' },
      ),
    ).resolves.toMatchObject({ success: true, data: { transactionId: 'transaction_1' } });
    await expect(
      controller.rejectExtraction(
        { id: 'user_1', email: 'lineo@example.com' },
        'extraction_1',
        { reason: '金额不准确' },
      ),
    ).resolves.toMatchObject({ success: true, data: { status: 'rejected' } });

    expect(aiService.confirmExtraction).toHaveBeenCalledWith(
      'user_1',
      'extraction_1',
      expect.objectContaining({ ledgerId: 'ledger_1' }),
    );
    expect(aiService.rejectExtraction).toHaveBeenCalledWith('user_1', 'extraction_1', { reason: '金额不准确' });
  });
});
