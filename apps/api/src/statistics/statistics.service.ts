import { ForbiddenException, Injectable } from '@nestjs/common';
import type {
  AccountBalanceStatisticsSummary,
  CategoryStatisticsSummary,
  MemberExpenseStatisticsSummary,
  MonthlyStatisticsSummary,
} from '@bookkeeping/shared-types';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import type { CategoryStatisticsQueryDto } from './dto/category-statistics-query.dto';
import type { StatisticsDateRangeQueryDto } from './dto/statistics-date-range-query.dto';
import { StatisticsRepository } from './statistics.repository';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
  ) {}

  async getMonthlySummary(
    userId: string,
    ledgerId: string,
    query: StatisticsDateRangeQueryDto,
  ): Promise<MonthlyStatisticsSummary> {
    await this.requireViewLedger(userId, ledgerId);
    return this.statisticsRepository.getMonthlySummary(userId, ledgerId, query);
  }

  async getCategoryBreakdown(
    userId: string,
    ledgerId: string,
    query: CategoryStatisticsQueryDto,
  ): Promise<CategoryStatisticsSummary> {
    await this.requireViewLedger(userId, ledgerId);
    return this.statisticsRepository.getCategoryBreakdown(userId, ledgerId, query);
  }

  async getAccountBalances(userId: string, ledgerId: string): Promise<AccountBalanceStatisticsSummary> {
    await this.requireViewLedger(userId, ledgerId);
    return this.statisticsRepository.getAccountBalances(userId, ledgerId);
  }

  async getMemberExpenses(
    userId: string,
    ledgerId: string,
    query: StatisticsDateRangeQueryDto,
  ): Promise<MemberExpenseStatisticsSummary> {
    await this.requireViewLedger(userId, ledgerId);
    return this.statisticsRepository.getMemberExpenses(userId, ledgerId, query);
  }

  private async requireViewLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
    }
  }
}
