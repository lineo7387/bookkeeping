import { StatisticsRepository } from './statistics.repository';

const occurredAt = new Date('2026-05-18T10:00:00.000Z');

function decimal(value: string): { toString(): string } {
  return { toString: () => value };
}

describe('StatisticsRepository', () => {
  it('summarizes visible income and expense without counting transfers', async () => {
    const prisma = {
      transaction: {
        findMany: jest.fn().mockResolvedValue([
          { type: 'income', amount: decimal('1200.00') },
          { type: 'expense', amount: decimal('350.50') },
          { type: 'transfer', amount: decimal('99.00') },
        ]),
      },
    };
    const repository = new StatisticsRepository(prisma as never);

    await expect(
      repository.getMonthlySummary('user_1', 'ledger_1', {
        occurredFrom: '2026-05-01T00:00:00.000Z',
        occurredTo: '2026-05-31T23:59:59.999Z',
      }),
    ).resolves.toEqual({
      ledgerId: 'ledger_1',
      occurredFrom: '2026-05-01T00:00:00.000Z',
      occurredTo: '2026-05-31T23:59:59.999Z',
      income: '1200.00',
      expense: '350.50',
      net: '849.50',
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        ledgerId: 'ledger_1',
        deletedAt: null,
        OR: [{ visibility: 'ledger' }, { visibility: 'private', createdBy: 'user_1' }],
        occurredAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      }),
      select: { type: true, amount: true },
    });
  });

  it('groups visible transactions by category and returns decimal percentages', async () => {
    const prisma = {
      transaction: {
        findMany: jest.fn().mockResolvedValue([
          { categoryId: 'category_food', amount: decimal('200.00'), category: { name: '餐饮' } },
          { categoryId: 'category_food', amount: decimal('100.00'), category: { name: '餐饮' } },
          { categoryId: null, amount: decimal('50.00'), category: null },
        ]),
      },
    };
    const repository = new StatisticsRepository(prisma as never);

    await expect(repository.getCategoryBreakdown('user_1', 'ledger_1', { type: 'expense' })).resolves.toEqual({
      ledgerId: 'ledger_1',
      type: 'expense',
      total: '350.00',
      items: [
        {
          categoryId: 'category_food',
          categoryName: '餐饮',
          amount: '300.00',
          transactionCount: 2,
          percentage: '85.71',
        },
        {
          categoryId: null,
          categoryName: null,
          amount: '50.00',
          transactionCount: 1,
          percentage: '14.29',
        },
      ],
    });
  });

  it('returns only visible account balances and totals them', async () => {
    const prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'account_cash',
            name: '现金',
            type: 'cash',
            currency: 'CNY',
            currentBalance: decimal('680.00'),
            visibility: 'ledger',
          },
          {
            id: 'account_private',
            name: '私房钱',
            type: 'cash',
            currency: 'CNY',
            currentBalance: decimal('2000.00'),
            visibility: 'private',
          },
        ]),
      },
    };
    const repository = new StatisticsRepository(prisma as never);

    await expect(repository.getAccountBalances('user_1', 'ledger_1')).resolves.toEqual({
      ledgerId: 'ledger_1',
      totalBalance: '2680.00',
      items: [
        {
          accountId: 'account_cash',
          accountName: '现金',
          type: 'cash',
          currency: 'CNY',
          currentBalance: '680.00',
          visibility: 'ledger',
        },
        {
          accountId: 'account_private',
          accountName: '私房钱',
          type: 'cash',
          currency: 'CNY',
          currentBalance: '2000.00',
          visibility: 'private',
        },
      ],
    });
    expect(prisma.account.findMany).toHaveBeenCalledWith({
      where: {
        ledgerId: 'ledger_1',
        archivedAt: null,
        OR: [{ visibility: 'ledger' }, { visibility: 'private', ownerId: 'user_1' }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        currentBalance: true,
        visibility: true,
      },
    });
  });

  it('groups visible expense transactions by creator member', async () => {
    const prisma = {
      transaction: {
        findMany: jest.fn().mockResolvedValue([
          { createdBy: 'user_1', amount: decimal('80.00'), creator: { nickname: '小林' } },
          { createdBy: 'user_2', amount: decimal('20.00'), creator: { nickname: '小周' } },
        ]),
      },
    };
    const repository = new StatisticsRepository(prisma as never);

    await expect(repository.getMemberExpenses('user_1', 'ledger_1', {})).resolves.toEqual({
      ledgerId: 'ledger_1',
      totalExpense: '100.00',
      items: [
        {
          userId: 'user_1',
          nickname: '小林',
          amount: '80.00',
          transactionCount: 1,
          percentage: '80.00',
        },
        {
          userId: 'user_2',
          nickname: '小周',
          amount: '20.00',
          transactionCount: 1,
          percentage: '20.00',
        },
      ],
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        ledgerId: 'ledger_1',
        deletedAt: null,
        type: 'expense',
        OR: [{ visibility: 'ledger' }, { visibility: 'private', createdBy: 'user_1' }],
      }),
      select: { createdBy: true, amount: true, creator: { select: { nickname: true } } },
    });
  });
});
