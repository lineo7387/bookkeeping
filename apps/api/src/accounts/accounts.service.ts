import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AccountSummary } from '@bookkeeping/shared-types';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { AccountsRepository, type AccountUpdateData } from './accounts.repository';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
  ) {}

  async listAccounts(userId: string, ledgerId: string): Promise<AccountSummary[]> {
    await this.requireViewLedger(userId, ledgerId);
    return this.accountsRepository.listVisibleForUser(userId, ledgerId);
  }

  async createAccount(userId: string, ledgerId: string, dto: CreateAccountDto): Promise<AccountSummary> {
    await this.requireManageLedger(userId, ledgerId);
    return this.accountsRepository.create(userId, ledgerId, dto);
  }

  async updateAccount(userId: string, accountId: string, dto: UpdateAccountDto): Promise<AccountSummary> {
    await this.requireViewAccount(userId, accountId);
    const account = await this.getActiveAccount(accountId);
    await this.requireAccountManage(userId, account);

    const updateData: AccountUpdateData = { ...dto };
    if (account.visibility === 'ledger' && dto.visibility === 'private') {
      updateData.ownerId = userId;
    }

    return this.accountsRepository.update(accountId, updateData);
  }

  async deleteAccount(userId: string, accountId: string): Promise<{ archived: true }> {
    await this.requireViewAccount(userId, accountId);
    const account = await this.getActiveAccount(accountId);
    await this.requireAccountManage(userId, account);
    return this.accountsRepository.archive(accountId);
  }

  private async getActiveAccount(accountId: string): Promise<AccountSummary> {
    const account = await this.accountsRepository.findActiveById(accountId);
    if (!account) {
      throw accountNotFound();
    }
    return account;
  }

  private async requireViewLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
    }
  }

  private async requireManageLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canManageLedger(userId, ledgerId);
    if (!allowed) {
      throw roleDenied();
    }
  }

  private async requireViewAccount(userId: string, accountId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewAccount(userId, accountId);
    if (!allowed) {
      throw accountNotFound();
    }
  }

  private async requireAccountManage(userId: string, account: AccountSummary): Promise<void> {
    if (account.visibility === 'private') {
      return;
    }

    await this.requireManageLedger(userId, account.ledgerId);
  }
}

function roleDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'));
}

function accountNotFound(): NotFoundException {
  return new NotFoundException(fail('ACCOUNT_NOT_FOUND', 'Account not found'));
}
