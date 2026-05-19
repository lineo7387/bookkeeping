import { ForbiddenException } from '@nestjs/common';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { StatisticsRepository } from './statistics.repository';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let repository: jest.Mocked<StatisticsRepository>;
  let policy: jest.Mocked<Pick<LedgerPolicyService, 'canViewLedger'>>;
  let service: StatisticsService;

  beforeEach(() => {
    repository = {
      getMonthlySummary: jest.fn(),
      getCategoryBreakdown: jest.fn(),
      getAccountBalances: jest.fn(),
      getMemberExpenses: jest.fn(),
    } as unknown as jest.Mocked<StatisticsRepository>;
    policy = {
      canViewLedger: jest.fn(),
    };
    service = new StatisticsService(repository, policy as unknown as LedgerPolicyService);
  });

  it('requires ledger view access before returning monthly summary', async () => {
    policy.canViewLedger.mockResolvedValue(true);
    repository.getMonthlySummary.mockResolvedValue({
      ledgerId: 'ledger_1',
      occurredFrom: '2026-05-01T00:00:00.000Z',
      occurredTo: '2026-05-31T23:59:59.999Z',
      income: '1200.00',
      expense: '350.50',
      net: '849.50',
    });

    await expect(
      service.getMonthlySummary('user_1', 'ledger_1', {
        occurredFrom: '2026-05-01T00:00:00.000Z',
        occurredTo: '2026-05-31T23:59:59.999Z',
      }),
    ).resolves.toMatchObject({ income: '1200.00', expense: '350.50', net: '849.50' });

    expect(policy.canViewLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.getMonthlySummary).toHaveBeenCalledWith('user_1', 'ledger_1', {
      occurredFrom: '2026-05-01T00:00:00.000Z',
      occurredTo: '2026-05-31T23:59:59.999Z',
    });
  });

  it('denies statistics when the user cannot view the ledger', async () => {
    policy.canViewLedger.mockResolvedValue(false);

    await expect(service.getMonthlySummary('user_1', 'ledger_1', {})).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'LEDGER_ACCESS_DENIED' } },
    });
    expect(repository.getMonthlySummary).not.toHaveBeenCalled();
  });

  it('delegates category, account, and member statistics after policy check', async () => {
    policy.canViewLedger.mockResolvedValue(true);
    repository.getCategoryBreakdown.mockResolvedValue({
      ledgerId: 'ledger_1',
      type: 'expense',
      total: '300.00',
      items: [],
    });
    repository.getAccountBalances.mockResolvedValue({
      ledgerId: 'ledger_1',
      totalBalance: '2600.00',
      items: [],
    });
    repository.getMemberExpenses.mockResolvedValue({
      ledgerId: 'ledger_1',
      totalExpense: '300.00',
      items: [],
    });

    await expect(service.getCategoryBreakdown('user_1', 'ledger_1', { type: 'expense' })).resolves.toMatchObject({
      total: '300.00',
    });
    await expect(service.getAccountBalances('user_1', 'ledger_1')).resolves.toMatchObject({
      totalBalance: '2600.00',
    });
    await expect(service.getMemberExpenses('user_1', 'ledger_1', {})).resolves.toMatchObject({
      totalExpense: '300.00',
    });

    expect(policy.canViewLedger).toHaveBeenCalledTimes(3);
    expect(repository.getCategoryBreakdown).toHaveBeenCalledWith('user_1', 'ledger_1', { type: 'expense' });
    expect(repository.getAccountBalances).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.getMemberExpenses).toHaveBeenCalledWith('user_1', 'ledger_1', {});
  });
});
