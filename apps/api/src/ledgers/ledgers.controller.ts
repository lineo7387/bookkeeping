import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequireLedgerPolicy } from '../common/guards/ledger-policy.decorator';
import { LedgerPolicyGuard } from '../common/guards/ledger-policy.guard';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { LedgersService } from './ledgers.service';

@Controller('ledgers')
@UseGuards(JwtAuthGuard, LedgerPolicyGuard)
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.ledgersService.listLedgers(user.id));
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLedgerDto) {
    return ok(await this.ledgersService.createLedger(user.id, dto));
  }

  @Get(':ledgerId/members')
  @RequireLedgerPolicy('manage')
  async listMembers(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
    return ok(await this.ledgersService.listMembers(user.id, ledgerId));
  }

  @Patch(':ledgerId/members/:memberId')
  @RequireLedgerPolicy('manage')
  async updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return ok(await this.ledgersService.updateMemberRole(user.id, ledgerId, memberId, dto));
  }

  @Delete(':ledgerId/members/:memberId')
  @RequireLedgerPolicy('manage')
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Param('memberId') memberId: string,
  ) {
    return ok(await this.ledgersService.removeMember(user.id, ledgerId, memberId));
  }

  @Get(':ledgerId')
  @RequireLedgerPolicy('view')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
    return ok(await this.ledgersService.getLedger(user.id, ledgerId));
  }

  @Patch(':ledgerId')
  @RequireLedgerPolicy('manage')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: UpdateLedgerDto,
  ) {
    return ok(await this.ledgersService.updateLedger(user.id, ledgerId, dto));
  }

  @Delete(':ledgerId')
  @RequireLedgerPolicy('manage')
  async archive(@CurrentUser() user: AuthenticatedUser, @Param('ledgerId') ledgerId: string) {
    return ok(await this.ledgersService.archiveLedger(user.id, ledgerId));
  }
}
