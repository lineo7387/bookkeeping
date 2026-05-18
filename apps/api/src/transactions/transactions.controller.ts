import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('ledgers/:ledgerId/transactions')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return ok(await this.transactionsService.listTransactions(user.id, ledgerId, query));
  }

  @Post('ledgers/:ledgerId/transactions')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return ok(await this.transactionsService.createTransaction(user.id, ledgerId, dto));
  }

  @Get('transactions/:transactionId')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('transactionId') transactionId: string) {
    return ok(await this.transactionsService.getTransaction(user.id, transactionId));
  }

  @Patch('transactions/:transactionId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return ok(await this.transactionsService.updateTransaction(user.id, transactionId, dto));
  }

  @Delete('transactions/:transactionId')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('transactionId') transactionId: string) {
    return ok(await this.transactionsService.deleteTransaction(user.id, transactionId));
  }
}
