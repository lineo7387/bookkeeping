import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AccountSummary,
  CategorySummary,
  TransactionSource,
  TransactionSummary,
  TransactionType,
} from '@bookkeeping/shared-types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  TransactionsRepository,
  type TransactionClient,
  type TransactionCreateData,
  type TransactionMetadata,
  type TransactionUpdateData,
  type TransferMetadata,
} from './transactions.repository';

export interface CreateTransactionFromAiInput {
  ledgerId: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  amount: string;
  currency?: string;
  occurredAt: string;
  merchant?: string | null;
  note?: string | null;
  visibility?: 'ledger' | 'private';
  transferTargetAccountId?: string;
  sourceExtractionId: string;
  source?: Extract<TransactionSource, 'ai_text' | 'ocr'>;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
    private readonly auditLogsService: AuditLogsService,
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
    const metadata = await this.resolveTransferMetadata(userId, ledgerId, dto.type, dto.transferTargetAccountId, account.id);
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

    const created = await this.transactionsRepository.createWithBalanceChanges(
      createData,
      buildBalanceChanges({
        accountId: createData.accountId,
        type: createData.type,
        amount: createData.amount,
        transferTargetAccountId: metadata?.value.transferTargetAccountId,
      }),
    );

    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId,
      targetType: 'transaction',
      targetId: created.id,
      action: 'transaction.create',
      summary: 'Created transaction',
      metadata: {
        type: created.type,
        amount: created.amount,
        currency: created.currency,
        accountId: created.accountId,
        categoryId: created.categoryId,
        visibility: created.visibility,
        source: created.source,
      },
    });

    return created;
  }

  async createFromAiExtraction(
    userId: string,
    input: CreateTransactionFromAiInput,
    tx?: TransactionClient,
  ): Promise<TransactionSummary> {
    await this.requireCreateTransaction(userId, input.ledgerId);
    if (!isPositiveDecimalString(input.amount)) {
      throw validationFailed('Amount must be a positive decimal string');
    }

    const account = await this.getVisibleActiveAccount(userId, input.accountId);
    if (account.ledgerId !== input.ledgerId) {
      throw accountNotFound();
    }

    let finalVisibility = input.visibility ?? 'ledger';
    if (account.visibility === 'private') {
      finalVisibility = 'private';
    }

    const categoryId = await this.resolveCategoryId(input.ledgerId, input.type, input.categoryId);
    const transferMetadata = await this.resolveTransferMetadata(
      userId,
      input.ledgerId,
      input.type,
      input.transferTargetAccountId,
      account.id,
    );
    if (transferMetadata?.targetAccount.visibility === 'private') {
      finalVisibility = 'private';
    }

    const metadata: TransactionMetadata = {
      ...(transferMetadata?.value ?? {}),
      aiExtractionId: input.sourceExtractionId,
    };
    const createData: TransactionCreateData = {
      ledgerId: input.ledgerId,
      accountId: account.id,
      categoryId,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? account.currency,
      occurredAt: new Date(input.occurredAt),
      merchant: input.merchant,
      note: input.note,
      visibility: finalVisibility,
      createdBy: userId,
      source: input.source ?? 'ai_text',
      metadata,
    };
    const balanceChanges = buildBalanceChanges({
      accountId: createData.accountId,
      type: createData.type,
      amount: createData.amount,
      transferTargetAccountId: transferMetadata?.value.transferTargetAccountId,
    });
    const created = tx
      ? await this.transactionsRepository.createWithBalanceChangesInTransaction(tx, createData, balanceChanges)
      : await this.transactionsRepository.createWithBalanceChanges(createData, balanceChanges);

    await this.auditLogsService.record(
      {
        actorUserId: userId,
        ledgerId: input.ledgerId,
        targetType: 'transaction',
        targetId: created.id,
        action: 'transaction.create',
        summary: 'Created transaction from AI text extraction',
        metadata: {
          type: created.type,
          amount: created.amount,
          currency: created.currency,
          accountId: created.accountId,
          categoryId: created.categoryId,
          visibility: created.visibility,
          source: created.source,
        },
      },
      tx,
    );

    return created;
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
    if (dto.transferTargetAccountId !== undefined && nextType !== 'transfer') {
      throw validationFailed('Transfer target account is only valid for transfer transactions');
    }

    const shouldValidateTransfer =
      nextType === 'transfer' &&
      (dto.type !== undefined ||
        dto.transferTargetAccountId !== undefined ||
        dto.visibility !== undefined ||
        dto.accountId !== undefined);
    if (
      shouldValidateTransfer &&
      !dto.transferTargetAccountId &&
      !getExistingTransferTargetAccountId(transaction.metadata)
    ) {
      throw validationFailed('Transfer target account is required');
    }

    let account: AccountSummary | null = null;
    let finalVisibility = dto.visibility;

    if (dto.accountId !== undefined || dto.visibility !== undefined || shouldValidateTransfer) {
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
    const metadata = shouldValidateTransfer
      ? await this.resolveTransferMetadata(
          userId,
          transaction.ledgerId,
          nextType,
          dto.transferTargetAccountId,
          dto.accountId ?? transaction.accountId,
          transaction.metadata,
        )
      : null;
    if (metadata?.targetAccount.visibility === 'private') {
      finalVisibility = 'private';
    }
    const metadataUpdate = resolveMetadataUpdate(transaction.type, nextType, metadata?.value);

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
      metadata: metadataUpdate,
    };
    const balanceChanges = buildUpdateBalanceChanges(transaction, updateData, metadataUpdate);

    const updated = await this.transactionsRepository.updateWithBalanceChanges(transactionId, updateData, balanceChanges);
    if (!updated) {
      throw transactionNotFound();
    }

    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId: transaction.ledgerId,
      targetType: 'transaction',
      targetId: transactionId,
      action: 'transaction.update',
      summary: 'Updated transaction',
      metadata: {
        type: updated.type,
        previousType: transaction.type,
        amount: updated.amount,
        previousAmount: transaction.amount,
        currency: updated.currency,
        previousCurrency: transaction.currency,
        accountId: updated.accountId,
        previousAccountId: transaction.accountId,
        categoryId: updated.categoryId,
        previousCategoryId: transaction.categoryId,
        visibility: updated.visibility,
        previousVisibility: transaction.visibility,
      },
    });

    return updated;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<{ deleted: true }> {
    await this.requireUpdateTransaction(userId, transactionId);
    const transaction = await this.getActiveTransaction(transactionId);
    const deleted = await this.transactionsRepository.softDeleteWithBalanceChanges(
      transactionId,
      new Date(),
      invertBalanceChanges(buildBalanceChanges(transactionToBalanceEffect(transaction))),
    );
    if (!deleted) {
      throw transactionNotFound();
    }

    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId: transaction.ledgerId,
      targetType: 'transaction',
      targetId: transactionId,
      action: 'transaction.delete',
      summary: 'Deleted transaction',
      metadata: {
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        visibility: transaction.visibility,
      },
    });

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
    transferSourceAccountId?: string,
    existingMetadata?: Record<string, unknown> | null,
  ): Promise<{ value: TransferMetadata; targetAccount: AccountSummary } | null> {
    if (type !== 'transfer') {
      if (transferTargetAccountId) {
        throw validationFailed('Transfer target account is only valid for transfer transactions');
      }
      return null;
    }

    const targetAccountId = transferTargetAccountId ?? getExistingTransferTargetAccountId(existingMetadata);
    if (!targetAccountId) {
      throw validationFailed('Transfer target account is required');
    }

    const targetAccount = await this.getVisibleActiveAccount(userId, targetAccountId);
    if (targetAccount.ledgerId !== ledgerId) {
      throw validationFailed('Transfer target account is invalid');
    }
    if (targetAccount.id === transferSourceAccountId) {
      throw validationFailed('Transfer target account must be different from source account');
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

function isPositiveDecimalString(value: string): boolean {
  return /^(?=.*[1-9])\d{1,16}(\.\d{1,2})?$/.test(value);
}

function getExistingTransferTargetAccountId(metadata?: Record<string, unknown> | null): string | undefined {
  const targetAccountId = metadata?.transferTargetAccountId;
  return typeof targetAccountId === 'string' && targetAccountId.length > 0 ? targetAccountId : undefined;
}

function resolveMetadataUpdate(
  previousType: TransactionType,
  nextType: TransactionType,
  transferMetadata?: TransferMetadata,
): TransferMetadata | null | undefined {
  if (transferMetadata) {
    return transferMetadata;
  }
  return previousType === 'transfer' && nextType !== 'transfer' ? null : undefined;
}

function transactionToBalanceEffect(transaction: TransactionSummary): BalanceEffect {
  return {
    accountId: transaction.accountId,
    type: transaction.type,
    amount: transaction.amount,
    transferTargetAccountId: getExistingTransferTargetAccountId(transaction.metadata),
  };
}

function buildUpdateBalanceChanges(
  transaction: TransactionSummary,
  data: TransactionUpdateData,
  metadataUpdate: TransferMetadata | null | undefined,
): AccountBalanceChange[] {
  const oldEffect = transactionToBalanceEffect(transaction);
  const nextEffect: BalanceEffect = {
    accountId: data.accountId ?? transaction.accountId,
    type: data.type ?? transaction.type,
    amount: data.amount ?? transaction.amount,
    transferTargetAccountId:
      metadataUpdate?.transferTargetAccountId ?? getExistingTransferTargetAccountId(transaction.metadata),
  };
  if (isSameBalanceEffect(oldEffect, nextEffect)) {
    return [];
  }
  return [...invertBalanceChanges(buildBalanceChanges(oldEffect)), ...buildBalanceChanges(nextEffect)];
}

function isSameBalanceEffect(left: BalanceEffect, right: BalanceEffect): boolean {
  return (
    left.accountId === right.accountId &&
    left.type === right.type &&
    left.amount === right.amount &&
    left.transferTargetAccountId === right.transferTargetAccountId
  );
}

type BalanceEffect = {
  accountId: string;
  type: TransactionType;
  amount: string;
  transferTargetAccountId?: string;
};

type AccountBalanceChange = {
  accountId: string;
  delta: string;
};

function buildBalanceChanges(effect: BalanceEffect): AccountBalanceChange[] {
  if (effect.type === 'income') {
    return [{ accountId: effect.accountId, delta: effect.amount }];
  }
  if (effect.type === 'expense') {
    return [{ accountId: effect.accountId, delta: negateDecimalString(effect.amount) }];
  }
  if (!effect.transferTargetAccountId) {
    return [];
  }
  return [
    { accountId: effect.accountId, delta: negateDecimalString(effect.amount) },
    { accountId: effect.transferTargetAccountId, delta: effect.amount },
  ];
}

function negateDecimalString(value: string): string {
  return value.startsWith('-') ? value.slice(1) : `-${value}`;
}

function invertBalanceChanges(changes: AccountBalanceChange[]): AccountBalanceChange[] {
  return changes.map((change) => ({
    accountId: change.accountId,
    delta: negateDecimalString(change.delta),
  }));
}
