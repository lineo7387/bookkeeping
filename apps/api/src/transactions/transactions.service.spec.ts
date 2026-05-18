import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AccountSummary, CategorySummary, TransactionSummary } from '@bookkeeping/shared-types';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let repository: jest.Mocked<
    Pick<
      TransactionsRepository,
      | 'listVisibleForUser'
      | 'create'
      | 'findActiveById'
      | 'findActiveAccountById'
      | 'findActiveCategoryById'
      | 'update'
      | 'softDelete'
    >
  >;
  let policy: jest.Mocked<
    Pick<
      LedgerPolicyService,
      'canViewLedger' | 'canCreateTransaction' | 'canViewAccount' | 'canViewTransaction' | 'canUpdateTransaction'
    >
  >;
  let service: TransactionsService;

  const account: AccountSummary = {
    id: 'account_1',
    ledgerId: 'ledger_1',
    name: '现金',
    type: 'cash',
    currency: 'CNY',
    initialBalance: '0',
    currentBalance: '0',
    visibility: 'ledger',
    ownerId: 'user_1',
    sortOrder: 0,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  };

  const expenseCategory: CategorySummary = {
    id: 'category_1',
    ledgerId: 'ledger_1',
    parentId: null,
    type: 'expense',
    name: '餐饮',
    icon: null,
    color: null,
    isSystem: false,
    sortOrder: 0,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  };

  const transaction: TransactionSummary = {
    id: 'transaction_1',
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense',
    amount: '86.00',
    currency: 'CNY',
    occurredAt: '2026-05-18T10:00:00.000Z',
    merchant: '晚饭',
    note: null,
    visibility: 'ledger',
    createdBy: 'user_1',
    source: 'manual',
    metadata: null,
    createdAt: '2026-05-18T10:01:00.000Z',
    updatedAt: '2026-05-18T10:01:00.000Z',
  };

  beforeEach(() => {
    repository = {
      listVisibleForUser: jest.fn(),
      create: jest.fn(),
      findActiveById: jest.fn(),
      findActiveAccountById: jest.fn(),
      findActiveCategoryById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    policy = {
      canViewLedger: jest.fn(),
      canCreateTransaction: jest.fn(),
      canViewAccount: jest.fn(),
      canViewTransaction: jest.fn(),
      canUpdateTransaction: jest.fn(),
    };
    service = new TransactionsService(
      repository as unknown as TransactionsRepository,
      policy as unknown as LedgerPolicyService,
    );
  });

  it('lists only visible ledger transactions after ledger view check', async () => {
    policy.canViewLedger.mockResolvedValue(true);
    repository.listVisibleForUser.mockResolvedValue([transaction]);

    await expect(
      service.listTransactions('user_1', 'ledger_1', {
        type: 'expense',
        accountId: 'account_1',
        limit: 20,
        offset: 0,
      }),
    ).resolves.toEqual([transaction]);

    expect(policy.canViewLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.listVisibleForUser).toHaveBeenCalledWith('user_1', 'ledger_1', {
      type: 'expense',
      accountId: 'account_1',
      limit: 20,
      offset: 0,
    });
  });

  it('denies listing when the ledger is not visible', async () => {
    policy.canViewLedger.mockResolvedValue(false);

    await expect(service.listTransactions('user_1', 'ledger_1', {})).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'LEDGER_ACCESS_DENIED' } },
    });
    expect(repository.listVisibleForUser).not.toHaveBeenCalled();
  });

  it('requires canCreateTransaction before creating', async () => {
    policy.canCreateTransaction.mockResolvedValue(false);

    await expect(
      service.createTransaction('user_1', 'ledger_1', {
        type: 'expense',
        amount: '86.00',
        occurredAt: '2026-05-18T10:00:00.000Z',
        accountId: 'account_1',
        categoryId: 'category_1',
      }),
    ).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(policy.canViewAccount).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('validates account visibility through canViewAccount before fetching account details', async () => {
    policy.canCreateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(false);

    await expect(
      service.createTransaction('user_1', 'ledger_1', {
        type: 'expense',
        amount: '86.00',
        occurredAt: '2026-05-18T10:00:00.000Z',
        accountId: 'account_1',
        categoryId: 'category_1',
      }),
    ).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { success: false, error: { code: 'ACCOUNT_NOT_FOUND' } },
    });
    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_1');
    expect(repository.findActiveAccountById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('forces private transaction visibility when the source account is private', async () => {
    const privateAccount = { ...account, visibility: 'private' as const };
    policy.canCreateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveAccountById.mockResolvedValue(privateAccount);
    repository.findActiveCategoryById.mockResolvedValue(expenseCategory);
    repository.create.mockResolvedValue({ ...transaction, visibility: 'private' });

    await expect(
      service.createTransaction('user_1', 'ledger_1', {
        type: 'expense',
        amount: '86.00',
        occurredAt: '2026-05-18T10:00:00.000Z',
        accountId: 'account_1',
        categoryId: 'category_1',
        visibility: 'ledger',
      }),
    ).resolves.toMatchObject({ visibility: 'private' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ledgerId: 'ledger_1',
        createdBy: 'user_1',
        source: 'manual',
        visibility: 'private',
      }),
    );
  });

  it('requires expense and income categories to match the transaction type', async () => {
    policy.canCreateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveAccountById.mockResolvedValue(account);
    repository.findActiveCategoryById.mockResolvedValue({ ...expenseCategory, type: 'income' });

    await expect(
      service.createTransaction('user_1', 'ledger_1', {
        type: 'expense',
        amount: '86.00',
        occurredAt: '2026-05-18T10:00:00.000Z',
        accountId: 'account_1',
        categoryId: 'category_1',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('stores transfer target account data in metadata after target visibility validation', async () => {
    policy.canCreateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveAccountById.mockResolvedValueOnce(account).mockResolvedValueOnce({
      ...account,
      id: 'account_2',
      name: '银行卡',
    });
    repository.create.mockResolvedValue({
      ...transaction,
      type: 'transfer',
      categoryId: null,
      metadata: { transferTargetAccountId: 'account_2' },
    });

    await expect(
      service.createTransaction('user_1', 'ledger_1', {
        type: 'transfer',
        amount: '100.00',
        occurredAt: '2026-05-18T10:00:00.000Z',
        accountId: 'account_1',
        transferTargetAccountId: 'account_2',
      }),
    ).resolves.toMatchObject({
      type: 'transfer',
      categoryId: null,
      metadata: { transferTargetAccountId: 'account_2' },
    });

    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_1');
    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_2');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transfer',
        categoryId: null,
        metadata: { transferTargetAccountId: 'account_2' },
      }),
    );
  });

  it('rejects creating a transfer without transferTargetAccountId', async () => {
    policy.canCreateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveAccountById.mockResolvedValue(account);

    await expect(
      service.createTransaction('user_1', 'ledger_1', {
        type: 'transfer',
        amount: '100.00',
        occurredAt: '2026-05-18T10:00:00.000Z',
        accountId: 'account_1',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('requires canViewTransaction before fetching a transaction by id', async () => {
    policy.canViewTransaction.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(transaction);

    await expect(service.getTransaction('user_1', 'transaction_1')).resolves.toEqual(transaction);

    expect(policy.canViewTransaction).toHaveBeenCalledWith('user_1', 'transaction_1');
    expect(repository.findActiveById).toHaveBeenCalledWith('transaction_1');
  });

  it('uses non-leaky not found behavior when get policy denies access', async () => {
    policy.canViewTransaction.mockResolvedValue(false);

    await expect(service.getTransaction('user_1', 'transaction_1')).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { success: false, error: { message: 'Transaction not found' } },
    });
    expect(repository.findActiveById).not.toHaveBeenCalled();
  });

  it('requires canUpdateTransaction before updating a transaction by id', async () => {
    policy.canUpdateTransaction.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(transaction);
    repository.findActiveAccountById.mockResolvedValue(account);
    repository.findActiveCategoryById.mockResolvedValue(expenseCategory);
    repository.update.mockResolvedValue({ ...transaction, merchant: '便利店' });

    await expect(service.updateTransaction('user_1', 'transaction_1', { merchant: '便利店' })).resolves.toMatchObject({
      merchant: '便利店',
    });

    expect(policy.canUpdateTransaction).toHaveBeenCalledWith('user_1', 'transaction_1');
    expect(repository.update).toHaveBeenCalledWith('transaction_1', expect.objectContaining({ merchant: '便利店' }));
  });

  it('rejects updating a non-transfer to transfer without transferTargetAccountId', async () => {
    policy.canUpdateTransaction.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(transaction);

    await expect(service.updateTransaction('user_1', 'transaction_1', { type: 'transfer' })).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('forces private visibility when updating only visibility on an existing transfer with a private target account', async () => {
    const transferTransaction: TransactionSummary = {
      ...transaction,
      type: 'transfer',
      categoryId: null,
      visibility: 'private',
      metadata: { transferTargetAccountId: 'account_2' },
    };
    policy.canUpdateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(transferTransaction);
    repository.findActiveAccountById
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce({ ...account, id: 'account_2', visibility: 'private' });
    repository.update.mockResolvedValue({ ...transferTransaction, visibility: 'private' });

    await expect(service.updateTransaction('user_1', 'transaction_1', { visibility: 'ledger' })).resolves.toMatchObject({
      visibility: 'private',
    });

    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_1');
    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_2');
    expect(repository.update).toHaveBeenCalledWith(
      'transaction_1',
      expect.objectContaining({
        visibility: 'private',
        metadata: { transferTargetAccountId: 'account_2' },
      }),
    );
  });

  it('forces private visibility when a type-only transfer update has a private source account', async () => {
    const transferTransaction: TransactionSummary = {
      ...transaction,
      type: 'transfer',
      categoryId: null,
      visibility: 'ledger',
      metadata: { transferTargetAccountId: 'account_2' },
    };
    policy.canUpdateTransaction.mockResolvedValue(true);
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(transferTransaction);
    repository.findActiveAccountById.mockImplementation(async (accountId) => {
      if (accountId === 'account_1') {
        return { ...account, visibility: 'private' };
      }
      if (accountId === 'account_2') {
        return { ...account, id: 'account_2', name: '银行卡' };
      }
      return null;
    });
    repository.update.mockResolvedValue({ ...transferTransaction, visibility: 'private' });

    await expect(service.updateTransaction('user_1', 'transaction_1', { type: 'transfer' })).resolves.toMatchObject({
      visibility: 'private',
    });

    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_1');
    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_2');
    expect(repository.update).toHaveBeenCalledWith(
      'transaction_1',
      expect.objectContaining({
        type: 'transfer',
        visibility: 'private',
        metadata: { transferTargetAccountId: 'account_2' },
      }),
    );
  });

  it('rejects transferTargetAccountId on a non-transfer update', async () => {
    policy.canUpdateTransaction.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(transaction);

    await expect(
      service.updateTransaction('user_1', 'transaction_1', { transferTargetAccountId: 'account_2' }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses non-leaky not found behavior when update policy denies access', async () => {
    policy.canUpdateTransaction.mockResolvedValue(false);

    await expect(service.updateTransaction('user_1', 'transaction_1', { merchant: '便利店' })).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { success: false, error: { message: 'Transaction not found' } },
    });
    expect(repository.findActiveById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('soft deletes a transaction by setting deletedAt', async () => {
    policy.canUpdateTransaction.mockResolvedValue(true);
    repository.softDelete.mockResolvedValue({ deleted: true });

    await expect(service.deleteTransaction('user_1', 'transaction_1')).resolves.toEqual({ deleted: true });

    expect(policy.canUpdateTransaction).toHaveBeenCalledWith('user_1', 'transaction_1');
    expect(repository.softDelete).toHaveBeenCalledWith('transaction_1', expect.any(Date));
  });

  it('uses non-leaky not found behavior when delete policy denies access', async () => {
    policy.canUpdateTransaction.mockResolvedValue(false);

    await expect(service.deleteTransaction('user_1', 'transaction_1')).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { success: false, error: { message: 'Transaction not found' } },
    });
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
