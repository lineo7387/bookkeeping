import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AccountSummary } from '@bookkeeping/shared-types';
import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';
import { LedgerPolicyService } from '../policies/ledger-policy.service';

describe('AccountsService', () => {
  let repository: jest.Mocked<
    Pick<AccountsRepository, 'listVisibleForUser' | 'create' | 'findActiveById' | 'update' | 'archive'>
  >;
  let policy: jest.Mocked<Pick<LedgerPolicyService, 'canViewLedger' | 'canManageLedger' | 'canViewAccount'>>;
  let service: AccountsService;

  const accountSummary: AccountSummary = {
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

  beforeEach(() => {
    repository = {
      listVisibleForUser: jest.fn(),
      create: jest.fn(),
      findActiveById: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
    };
    policy = {
      canViewLedger: jest.fn(),
      canManageLedger: jest.fn(),
      canViewAccount: jest.fn(),
    };
    service = new AccountsService(
      repository as unknown as AccountsRepository,
      policy as unknown as LedgerPolicyService,
    );
  });

  it('lists only accounts visible to the current user after ledger view check', async () => {
    policy.canViewLedger.mockResolvedValue(true);
    repository.listVisibleForUser.mockResolvedValue([accountSummary]);

    await expect(service.listAccounts('user_1', 'ledger_1')).resolves.toEqual([accountSummary]);

    expect(policy.canViewLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.listVisibleForUser).toHaveBeenCalledWith('user_1', 'ledger_1');
  });

  it('denies listing accounts when the user cannot view the ledger', async () => {
    policy.canViewLedger.mockResolvedValue(false);

    await expect(service.listAccounts('user_1', 'ledger_1')).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'LEDGER_ACCESS_DENIED' } },
    });
    expect(repository.listVisibleForUser).not.toHaveBeenCalled();
  });

  it('requires ledger management before creating a shared account', async () => {
    policy.canManageLedger.mockResolvedValue(false);

    await expect(
      service.createAccount('user_1', 'ledger_1', {
        name: '招商银行',
        type: 'bank_card',
        visibility: 'ledger',
      }),
    ).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a private account with ownerId set to the current user after ledger management check', async () => {
    const privateAccount = { ...accountSummary, visibility: 'private' as const };
    policy.canManageLedger.mockResolvedValue(true);
    repository.create.mockResolvedValue(privateAccount);

    await expect(
      service.createAccount('user_1', 'ledger_1', {
        name: '微信零钱',
        type: 'wechat',
        visibility: 'private',
        initialBalance: '12.30',
        currentBalance: '12.30',
      }),
    ).resolves.toEqual(privateAccount);

    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.create).toHaveBeenCalledWith('user_1', 'ledger_1', {
      name: '微信零钱',
      type: 'wechat',
      visibility: 'private',
      initialBalance: '12.30',
      currentBalance: '12.30',
    });
  });

  it('allows only the owner to update a private account', async () => {
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue({
      ...accountSummary,
      visibility: 'private',
      ownerId: 'user_2',
    });

    await expect(service.updateAccount('user_1', 'account_1', { name: '私密现金' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'PRIVATE_RESOURCE_DENIED' } },
    });
    expect(policy.canManageLedger).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('requires ledger management before updating a shared account', async () => {
    policy.canManageLedger.mockResolvedValue(false);
    repository.findActiveById.mockResolvedValue(accountSummary);

    await expect(service.updateAccount('user_1', 'account_1', { name: '家庭现金' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates a private account when the current user owns it', async () => {
    const privateAccount = {
      ...accountSummary,
      visibility: 'private' as const,
      ownerId: 'user_1',
    };
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(privateAccount);
    repository.update.mockResolvedValue({ ...privateAccount, name: '私密现金' });

    await expect(service.updateAccount('user_1', 'account_1', { name: '私密现金' })).resolves.toMatchObject({
      name: '私密现金',
    });

    expect(repository.update).toHaveBeenCalledWith('account_1', { name: '私密现金' });
  });

  it('denies private account update when the owner is no longer allowed by account policy', async () => {
    repository.findActiveById.mockResolvedValue({
      ...accountSummary,
      visibility: 'private',
      ownerId: 'user_1',
    });
    policy.canViewAccount.mockResolvedValue(false);

    await expect(service.updateAccount('user_1', 'account_1', { name: '私密现金' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'PRIVATE_RESOURCE_DENIED' } },
    });
    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_1');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('archives an account instead of removing it', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(accountSummary);
    repository.archive.mockResolvedValue({ archived: true });

    await expect(service.deleteAccount('user_1', 'account_1')).resolves.toEqual({ archived: true });

    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.archive).toHaveBeenCalledWith('account_1');
  });

  it('allows only the owner to delete a private account', async () => {
    policy.canViewAccount.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue({
      ...accountSummary,
      visibility: 'private',
      ownerId: 'user_2',
    });

    await expect(service.deleteAccount('user_1', 'account_1')).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'PRIVATE_RESOURCE_DENIED' } },
    });
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('denies private account delete when the owner is no longer allowed by account policy', async () => {
    repository.findActiveById.mockResolvedValue({
      ...accountSummary,
      visibility: 'private',
      ownerId: 'user_1',
    });
    policy.canViewAccount.mockResolvedValue(false);

    await expect(service.deleteAccount('user_1', 'account_1')).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'PRIVATE_RESOURCE_DENIED' } },
    });
    expect(policy.canViewAccount).toHaveBeenCalledWith('user_1', 'account_1');
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('raises account not found when updating an archived or missing account', async () => {
    repository.findActiveById.mockResolvedValue(null);

    await expect(service.updateAccount('user_1', 'account_1', { name: '不存在' })).rejects.toMatchObject({
      constructor: NotFoundException,
      response: { success: false, error: { code: 'ACCOUNT_NOT_FOUND' } },
    });
  });
});
