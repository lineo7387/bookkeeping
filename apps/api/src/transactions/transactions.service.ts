import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AccountSummary,
  CategorySummary,
  TransactionSummary,
  TransactionType,
} from '@bookkeeping/shared-types';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  TransactionsRepository,
  type TransactionCreateData,
  type TransactionUpdateData,
  type TransferMetadata,
} from './transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
  ) {}

  async listTransactions(
    userId: string,
    ledgerId: string,
    query: ListTransactionsQueryDto = {},
  ): Promise<TransactionSummary[]> {
    await this.requireViewLedger(userId, ledgerId);
    return this.transactionsRepository.listVisibleForUser(userId, ledgerId, query);
  }

  async createTransaction(
    userId: string,
    ledgerId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionSummary> {
    await this.requireCreateTransaction(userId, ledgerId);

    const account = await this.getVisibleActiveAccount(userId, dto.accountId);
    if (account.ledgerId !== ledgerId) {
      throw accountNotFound();
    }

    let finalVisibility = dto.visibility ?? 'ledger';
    if (account.visibility === 'private') {
      finalVisibility = 'private';
    }

    const categoryId = await this.resolveCategoryId(ledgerId, dto.type, dto.categoryId);
    const metadata = await this.resolveTransferMetadata(userId, ledgerId, dto.type, dto.transferTargetAccountId);
    if (metadata?.targetAccount.visibility === 'private') {
      finalVisibility = 'private';
    }

    const createData: TransactionCreateData = {
      ledgerId,
      accountId: account.id,
      categoryId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency ?? account.currency,
      occurredAt: new Date(dto.occurredAt),
      merchant: dto.merchant,
      note: dto.note,
      visibility: finalVisibility,
      createdBy: userId,
      source: 'manual',
      metadata: metadata?.value ?? null,
    };

    return this.transactionsRepository.create(createData);
  }

  async getTransaction(userId: string, transactionId: string): Promise<TransactionSummary> {
    await this.requireViewTransaction(userId, transactionId);
    return this.getActiveTransaction(transactionId);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionSummary> {
    await this.requireUpdateTransaction(userId, transactionId);
    const transaction = await this.getActiveTransaction(transactionId);

    const nextType = dto.type ?? transaction.type;
    let account: AccountSummary | null = null;
    let finalVisibility = dto.visibility;

    if (dto.accountId !== undefined || dto.visibility !== undefined) {
      account = await this.getVisibleActiveAccount(userId, dto.accountId ?? transaction.accountId);
      if (account.ledgerId !== transaction.ledgerId) {
        throw accountNotFound();
      }
      if (account.visibility === 'private') {
        finalVisibility = 'private';
      }
    }

    const shouldValidateCategory = dto.type !== undefined || dto.categoryId !== undefined;
    const categoryId = shouldValidateCategory
      ? await this.resolveCategoryId(
          transaction.ledgerId,
          nextType,
          dto.categoryId !== undefined ? dto.categoryId : transaction.categoryId,
        )
      : undefined;
    const shouldValidateTransfer = dto.type === 'transfer' || dto.transferTargetAccountId !== undefined;
    const metadata = shouldValidateTransfer
      ? await this.resolveTransferMetadata(userId, transaction.ledgerId, nextType, dto.transferTargetAccountId)
      : null;
    if (metadata?.targetAccount.visibility === 'private') {
      finalVisibility = 'private';
    }

    const updateData: TransactionUpdateData = {
      accountId: account?.id,
      categoryId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      merchant: dto.merchant,
      note: dto.note,
      visibility: finalVisibility,
      metadata: metadata ? metadata.value : undefined,
    };

    const updated = await this.transactionsRepository.update(transactionId, updateData);
    if (!updated) {
      throw transactionNotFound();
    }

    return updated;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<{ deleted: true }> {
    await this.requireUpdateTransaction(userId, transactionId);
    const deleted = await this.transactionsRepository.softDelete(transactionId, new Date());
    if (!deleted) {
      throw transactionNotFound();
    }

    return deleted;
  }

  private async getActiveTransaction(transactionId: string): Promise<TransactionSummary> {
    const transaction = await this.transactionsRepository.findActiveById(transactionId);
    if (!transaction) {
      throw transactionNotFound();
    }
    return transaction;
  }

  private async getVisibleActiveAccount(userId: string, accountId: string): Promise<AccountSummary> {
    const allowed = await this.ledgerPolicyService.canViewAccount(userId, accountId);
    if (!allowed) {
      throw accountNotFound();
    }

    const account = await this.transactionsRepository.findActiveAccountById(accountId);
    if (!account) {
      throw accountNotFound();
    }
    return account;
  }

  private async getActiveCategory(categoryId: string): Promise<CategorySummary> {
    const category = await this.transactionsRepository.findActiveCategoryById(categoryId);
    if (!category) {
      throw validationFailed('Category is invalid');
    }
    return category;
  }

  private async resolveCategoryId(
    ledgerId: string,
    type: TransactionType,
    categoryId: string | null | undefined,
  ): Promise<string | null> {
    if (type === 'transfer') {
      return null;
    }

    if (!categoryId) {
      throw validationFailed('Category is required for income and expense transactions');
    }

    const category = await this.getActiveCategory(categoryId);
    if (category.ledgerId !== ledgerId || category.type !== type) {
      throw validationFailed('Category is invalid for transaction type');
    }

    return category.id;
  }

  private async resolveTransferMetadata(
    userId: string,
    ledgerId: string,
    type: TransactionType,
    transferTargetAccountId?: string,
  ): Promise<{ value: TransferMetadata; targetAccount: AccountSummary } | null> {
    if (type !== 'transfer' || !transferTargetAccountId) {
      return null;
    }

    const targetAccount = await this.getVisibleActiveAccount(userId, transferTargetAccountId);
    if (targetAccount.ledgerId !== ledgerId) {
      throw validationFailed('Transfer target account is invalid');
    }

    return {
      value: { transferTargetAccountId: targetAccount.id },
      targetAccount,
    };
  }

  private async requireViewLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
    }
  }

  private async requireCreateTransaction(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canCreateTransaction(userId, ledgerId);
    if (!allowed) {
      throw roleDenied();
    }
  }

  private async requireViewTransaction(userId: string, transactionId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewTransaction(userId, transactionId);
    if (!allowed) {
      throw transactionNotFound();
    }
  }

  private async requireUpdateTransaction(userId: string, transactionId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canUpdateTransaction(userId, transactionId);
    if (!allowed) {
      throw transactionNotFound();
    }
  }
}

function roleDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'));
}

function accountNotFound(): NotFoundException {
  return new NotFoundException(fail('ACCOUNT_NOT_FOUND', 'Account not found'));
}

function transactionNotFound(): NotFoundException {
  return new NotFoundException(fail('VALIDATION_FAILED', 'Transaction not found'));
}

function validationFailed(message: string): BadRequestException {
  return new BadRequestException(fail('VALIDATION_FAILED', message));
}
