import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequireLedgerPolicy } from '../common/guards/ledger-policy.decorator';
import { LedgerPolicyGuard } from '../common/guards/ledger-policy.guard';
import { CategoryStatisticsQueryDto } from './dto/category-statistics-query.dto';
import { StatisticsDateRangeQueryDto } from './dto/statistics-date-range-query.dto';
import { StatisticsService } from './statistics.service';

@Controller('ledgers/:ledgerId/statistics')
@UseGuards(JwtAuthGuard, LedgerPolicyGuard)
@RequireLedgerPolicy('view')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('monthly')
  async monthly(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Query() query: StatisticsDateRangeQueryDto,
  ) {
    return ok(await this.statisticsService.getMonthlySummary(user.id, ledgerId, query));
  }

  @Get('categories')
  async categories(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Query() query: CategoryStatisticsQueryDto,
  ) {
    return ok(await this.statisticsService.getCategoryBreakdown(user.id, ledgerId, query));
  }

  @Get('accounts')
  async accounts(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
    return ok(await this.statisticsService.getAccountBalances(user.id, ledgerId));
  }

  @Get('members')
  async members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Query() query: StatisticsDateRangeQueryDto,
  ) {
    return ok(await this.statisticsService.getMemberExpenses(user.id, ledgerId, query));
  }
}
