import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

describe('AccountsController', () => {
  let accountsService: jest.Mocked<Pick<AccountsService, 'listAccounts' | 'createAccount' | 'updateAccount' | 'deleteAccount'>>;
  let controller: AccountsController;

  beforeEach(() => {
    accountsService = {
      listAccounts: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
    };
    controller = new AccountsController(accountsService as unknown as AccountsService);
  });

  it('wraps GET /ledgers/:ledgerId/accounts results', async () => {
    accountsService.listAccounts.mockResolvedValue([
      {
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
      },
    ]);

    await expect(controller.list({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1')).resolves.toMatchObject({
      success: true,
      data: [{ id: 'account_1', ledgerId: 'ledger_1' }],
    });
    expect(accountsService.listAccounts).toHaveBeenCalledWith('user_1', 'ledger_1');
  });

  it('wraps POST /ledgers/:ledgerId/accounts result', async () => {
    accountsService.createAccount.mockResolvedValue({
      id: 'account_1',
      ledgerId: 'ledger_1',
      name: '微信零钱',
      type: 'wechat',
      currency: 'CNY',
      initialBalance: '12.30',
      currentBalance: '12.30',
      visibility: 'private',
      ownerId: 'user_1',
      sortOrder: 0,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    await expect(
      controller.create(
        { id: 'user_1', email: 'lineo@example.com' },
        'ledger_1',
        { name: '微信零钱', type: 'wechat', visibility: 'private', initialBalance: '12.30' },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'account_1', visibility: 'private', ownerId: 'user_1' },
    });
    expect(accountsService.createAccount).toHaveBeenCalledWith('user_1', 'ledger_1', {
      name: '微信零钱',
      type: 'wechat',
      visibility: 'private',
      initialBalance: '12.30',
    });
  });

  it('wraps PATCH /accounts/:accountId result', async () => {
    accountsService.updateAccount.mockResolvedValue({
      id: 'account_1',
      ledgerId: 'ledger_1',
      name: '现金备用',
      type: 'cash',
      currency: 'CNY',
      initialBalance: '0',
      currentBalance: '0',
      visibility: 'ledger',
      ownerId: 'user_1',
      sortOrder: 0,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    await expect(
      controller.update({ id: 'user_1', email: 'lineo@example.com' }, 'account_1', { name: '现金备用' }),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'account_1', name: '现金备用' },
    });
    expect(accountsService.updateAccount).toHaveBeenCalledWith('user_1', 'account_1', { name: '现金备用' });
  });

  it('wraps DELETE /accounts/:accountId result', async () => {
    accountsService.deleteAccount.mockResolvedValue({ archived: true });

    await expect(controller.remove({ id: 'user_1', email: 'lineo@example.com' }, 'account_1')).resolves.toEqual({
      success: true,
      data: { archived: true },
    });
    expect(accountsService.deleteAccount).toHaveBeenCalledWith('user_1', 'account_1');
  });
});
