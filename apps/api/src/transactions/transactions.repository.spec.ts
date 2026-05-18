import { TransactionsRepository, type TransactionCreateData } from './transactions.repository';

const now = new Date('2026-05-18T10:00:00.000Z');

function decimal(value: string): { toString(): string } {
  return { toString: () => value };
}

describe('TransactionsRepository', () => {
  const transactionRecord = {
    id: 'transaction_1',
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense' as const,
    amount: decimal('86.00'),
    currency: 'CNY',
    occurredAt: now,
    merchant: '晚饭',
    note: null,
    visibility: 'ledger' as const,
    createdBy: 'user_1',
    source: 'manual' as const,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };

  const createData: TransactionCreateData = {
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense',
    amount: '86.00',
    currency: 'CNY',
    occurredAt: now,
    merchant: '晚饭',
    note: null,
    visibility: 'ledger',
    createdBy: 'user_1',
    source: 'manual',
    metadata: null,
  };

  it('creates a transaction and increments account balances in one prisma transaction', async () => {
    const tx = {
      transaction: {
        create: jest.fn().mockResolvedValue(transactionRecord),
      },
      account: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TransactionsRepository(prisma as never);

    await expect(
      repository.createWithBalanceChanges(createData, [{ accountId: 'account_1', delta: '-86.00' }]),
    ).resolves.toMatchObject({ id: 'transaction_1', amount: '86.00' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ledgerId: 'ledger_1',
        accountId: 'account_1',
        amount: '86.00',
      }),
    });
    expect(tx.account.updateMany).toHaveBeenCalledWith({
      where: { id: 'account_1', archivedAt: null },
      data: { currentBalance: { increment: '-86.00' } },
    });
  });

  it('applies balance changes and updates a transaction in one prisma transaction', async () => {
    const tx = {
      transaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ ...transactionRecord, merchant: '便利店' }),
      },
      account: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TransactionsRepository(prisma as never);

    await expect(
      repository.updateWithBalanceChanges('transaction_1', { merchant: '便利店' }, [
        { accountId: 'account_1', delta: '86.00' },
        { accountId: 'account_1', delta: '-120.00' },
      ]),
    ).resolves.toMatchObject({ merchant: '便利店' });

    expect(tx.account.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'account_1', archivedAt: null },
      data: { currentBalance: { increment: '86.00' } },
    });
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'transaction_1', deletedAt: null },
      data: expect.objectContaining({ merchant: '便利店' }),
    });
    expect(tx.account.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'account_1', archivedAt: null },
      data: { currentBalance: { increment: '-120.00' } },
    });
  });

  it('returns null when update does not affect an active transaction', async () => {
    const tx = {
      transaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn(),
      },
      account: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TransactionsRepository(prisma as never);

    await expect(repository.updateWithBalanceChanges('missing', { merchant: '便利店' }, [])).resolves.toBeNull();

    expect(tx.transaction.findFirst).not.toHaveBeenCalled();
  });

  it('reverses balance changes and soft deletes in one prisma transaction', async () => {
    const deletedAt = new Date('2026-05-19T00:00:00.000Z');
    const tx = {
      transaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      account: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TransactionsRepository(prisma as never);

    await expect(
      repository.softDeleteWithBalanceChanges('transaction_1', deletedAt, [
        { accountId: 'account_1', delta: '86.00' },
      ]),
    ).resolves.toEqual({ deleted: true });

    expect(tx.account.updateMany).toHaveBeenCalledWith({
      where: { id: 'account_1', archivedAt: null },
      data: { currentBalance: { increment: '86.00' } },
    });
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'transaction_1', deletedAt: null },
      data: { deletedAt },
    });
  });
});
