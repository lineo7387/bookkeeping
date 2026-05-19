import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AccountSummary } from '@bookkeeping/shared-types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
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
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listAccounts(userId: string, ledgerId: string): Promise<AccountSummary[]> {
    await this.requireViewLedger(userId, ledgerId);
    return this.accountsRepository.listVisibleForUser(userId, ledgerId);
  }

  async createAccount(userId: string, ledgerId: string, dto: CreateAccountDto): Promise<AccountSummary> {
    await this.requireManageLedger(userId, ledgerId);
    const account = await this.accountsRepository.create(userId, ledgerId, dto);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId,
      targetType: 'account',
      targetId: account.id,
      action: 'account.create',
      summary: 'Created account',
      metadata: accountAuditMetadata(account),
    });
    return account;
  }

  async updateAccount(userId: string, accountId: string, dto: UpdateAccountDto): Promise<AccountSummary> {
    await this.requireViewAccount(userId, accountId);
    const account = await this.getActiveAccount(accountId);
    await this.requireAccountManage(userId, account);

    const updateData: AccountUpdateData = { ...dto };
    if (account.visibility === 'ledger' && dto.visibility === 'private') {
      updateData.ownerId = userId;
    }

    const updated = await this.accountsRepository.update(accountId, updateData);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId: account.ledgerId,
      targetType: 'account',
      targetId: accountId,
      action: 'account.update',
      summary: 'Updated account',
      metadata: {
        ...accountAuditMetadata(updated),
        previousName: account.name,
        previousType: account.type,
        previousCurrency: account.currency,
        previousVisibility: account.visibility,
        previousCurrentBalance: account.currentBalance,
      },
    });
    return updated;
  }

  async deleteAccount(userId: string, accountId: string): Promise<{ archived: true }> {
    await this.requireViewAccount(userId, accountId);
    const account = await this.getActiveAccount(accountId);
    await this.requireAccountManage(userId, account);
    const archived = await this.accountsRepository.archive(accountId);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId: account.ledgerId,
      targetType: 'account',
      targetId: accountId,
      action: 'account.archive',
      summary: 'Archived account',
      metadata: accountAuditMetadata(account),
    });
    return archived;
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

function accountAuditMetadata(account: AccountSummary): Record<string, unknown> {
  return {
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalance: account.initialBalance,
    currentBalance: account.currentBalance,
    visibility: account.visibility,
    ownerId: account.ownerId,
  };
}
