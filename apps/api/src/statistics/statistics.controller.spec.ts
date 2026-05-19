import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

describe('StatisticsController', () => {
  let statisticsService: jest.Mocked<StatisticsService>;
  let controller: StatisticsController;

  beforeEach(() => {
    statisticsService = {
      getMonthlySummary: jest.fn(),
      getCategoryBreakdown: jest.fn(),
      getAccountBalances: jest.fn(),
      getMemberExpenses: jest.fn(),
    } as unknown as jest.Mocked<StatisticsService>;
    controller = new StatisticsController(statisticsService);
  });

  it('wraps monthly statistics results', async () => {
    statisticsService.getMonthlySummary.mockResolvedValue({
      ledgerId: 'ledger_1',
      occurredFrom: '2026-05-01T00:00:00.000Z',
      occurredTo: '2026-05-31T23:59:59.999Z',
      income: '1200.00',
      expense: '350.50',
      net: '849.50',
    });

    await expect(
      controller.monthly({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1', {
        occurredFrom: '2026-05-01T00:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      success: true,
      data: { ledgerId: 'ledger_1', income: '1200.00' },
    });
    expect(statisticsService.getMonthlySummary).toHaveBeenCalledWith('user_1', 'ledger_1', {
      occurredFrom: '2026-05-01T00:00:00.000Z',
    });
  });

  it('wraps category, account, and member statistics results', async () => {
    statisticsService.getCategoryBreakdown.mockResolvedValue({
      ledgerId: 'ledger_1',
      type: 'expense',
      total: '86.00',
      items: [],
    });
    statisticsService.getAccountBalances.mockResolvedValue({
      ledgerId: 'ledger_1',
      totalBalance: '100.00',
      items: [],
    });
    statisticsService.getMemberExpenses.mockResolvedValue({
      ledgerId: 'ledger_1',
      totalExpense: '86.00',
      items: [],
    });

    await expect(controller.categories({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1', {})).resolves.toEqual({
      success: true,
      data: { ledgerId: 'ledger_1', type: 'expense', total: '86.00', items: [] },
    });
    await expect(controller.accounts({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1')).resolves.toEqual({
      success: true,
      data: { ledgerId: 'ledger_1', totalBalance: '100.00', items: [] },
    });
    await expect(controller.members({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1', {})).resolves.toEqual({
      success: true,
      data: { ledgerId: 'ledger_1', totalExpense: '86.00', items: [] },
    });
  });
});
