import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let transactionsService: jest.Mocked<
    Pick<
      TransactionsService,
      'listTransactions' | 'createTransaction' | 'getTransaction' | 'updateTransaction' | 'deleteTransaction'
    >
  >;
  let controller: TransactionsController;

  const transaction = {
    id: 'transaction_1',
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense' as const,
    amount: '86.00',
    currency: 'CNY',
    occurredAt: '2026-05-18T10:00:00.000Z',
    merchant: '晚饭',
    note: null,
    visibility: 'ledger' as const,
    createdBy: 'user_1',
    source: 'manual' as const,
    metadata: null,
    createdAt: '2026-05-18T10:01:00.000Z',
    updatedAt: '2026-05-18T10:01:00.000Z',
  };

  beforeEach(() => {
    transactionsService = {
      listTransactions: jest.fn(),
      createTransaction: jest.fn(),
      getTransaction: jest.fn(),
      updateTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
    };
    controller = new TransactionsController(transactionsService as unknown as TransactionsService);
  });

  it('wraps GET /ledgers/:ledgerId/transactions results', async () => {
    transactionsService.listTransactions.mockResolvedValue([transaction]);

    await expect(
      controller.list({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1', {
        type: 'expense',
        limit: 20,
      }),
    ).resolves.toMatchObject({
      success: true,
      data: [{ id: 'transaction_1', ledgerId: 'ledger_1', type: 'expense' }],
    });
    expect(transactionsService.listTransactions).toHaveBeenCalledWith('user_1', 'ledger_1', {
      type: 'expense',
      limit: 20,
    });
  });

  it('wraps POST /ledgers/:ledgerId/transactions result', async () => {
    transactionsService.createTransaction.mockResolvedValue(transaction);

    await expect(
      controller.create(
        { id: 'user_1', email: 'lineo@example.com' },
        'ledger_1',
        {
          type: 'expense',
          amount: '86.00',
          occurredAt: '2026-05-18T10:00:00.000Z',
          accountId: 'account_1',
          categoryId: 'category_1',
        },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'transaction_1', amount: '86.00' },
    });
    expect(transactionsService.createTransaction).toHaveBeenCalledWith('user_1', 'ledger_1', {
      type: 'expense',
      amount: '86.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
    });
  });

  it('wraps GET /transactions/:transactionId result', async () => {
    transactionsService.getTransaction.mockResolvedValue(transaction);

    await expect(controller.get({ id: 'user_1', email: 'lineo@example.com' }, 'transaction_1')).resolves.toMatchObject({
      success: true,
      data: { id: 'transaction_1' },
    });
    expect(transactionsService.getTransaction).toHaveBeenCalledWith('user_1', 'transaction_1');
  });

  it('wraps PATCH /transactions/:transactionId result', async () => {
    transactionsService.updateTransaction.mockResolvedValue({ ...transaction, merchant: '便利店' });

    await expect(
      controller.update({ id: 'user_1', email: 'lineo@example.com' }, 'transaction_1', { merchant: '便利店' }),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'transaction_1', merchant: '便利店' },
    });
    expect(transactionsService.updateTransaction).toHaveBeenCalledWith('user_1', 'transaction_1', {
      merchant: '便利店',
    });
  });

  it('wraps DELETE /transactions/:transactionId result', async () => {
    transactionsService.deleteTransaction.mockResolvedValue({ deleted: true });

    await expect(controller.remove({ id: 'user_1', email: 'lineo@example.com' }, 'transaction_1')).resolves.toEqual({
      success: true,
      data: { deleted: true },
    });
    expect(transactionsService.deleteTransaction).toHaveBeenCalledWith('user_1', 'transaction_1');
  });
});
