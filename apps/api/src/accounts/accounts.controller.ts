import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountsService } from './accounts.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('ledgers/:ledgerId/accounts')
  async list(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
    return ok(await this.accountsService.listAccounts(user.id, ledgerId));
  }

  @Post('ledgers/:ledgerId/accounts')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return ok(await this.accountsService.createAccount(user.id, ledgerId, dto));
  }

  @Patch('accounts/:accountId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return ok(await this.accountsService.updateAccount(user.id, accountId, dto));
  }

  @Delete('accounts/:accountId')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('accountId') accountId: string) {
    return ok(await this.accountsService.deleteAccount(user.id, accountId));
  }
}
