import { ForbiddenException } from '@nestjs/common';
import type { LedgerSummary } from '@bookkeeping/shared-types';
import { LedgersRepository } from './ledgers.repository';
import { LedgersService } from './ledgers.service';
import { LedgerPolicyService } from '../policies/ledger-policy.service';

describe('LedgersService', () => {
  let repository: jest.Mocked<
    Pick<
      LedgersRepository,
      | 'createWithOwner'
      | 'findLedgersForUser'
      | 'findLedgerForUser'
      | 'updateLedger'
      | 'archiveLedger'
      | 'findMember'
      | 'listMembers'
      | 'updateMemberRole'
      | 'removeMember'
    >
  >;
  let policy: jest.Mocked<Pick<LedgerPolicyService, 'canViewLedger' | 'canManageLedger'>>;
  let service: LedgersService;

  const ledgerSummary: LedgerSummary = {
    id: 'ledger_1',
    name: '家庭账本',
    type: 'family' as const,
    defaultCurrency: 'CNY',
    timezone: 'Asia/Shanghai',
    currentMember: {
      role: 'owner' as const,
      permissions: ['ledger:view', 'ledger:manage'],
    },
  };

  beforeEach(() => {
    repository = {
      createWithOwner: jest.fn(),
      findLedgersForUser: jest.fn(),
      findLedgerForUser: jest.fn(),
      updateLedger: jest.fn(),
      archiveLedger: jest.fn(),
      findMember: jest.fn(),
      listMembers: jest.fn(),
      updateMemberRole: jest.fn(),
      removeMember: jest.fn(),
    };
    policy = {
      canViewLedger: jest.fn(),
      canManageLedger: jest.fn(),
    };
    service = new LedgersService(
      repository as unknown as LedgersRepository,
      policy as unknown as LedgerPolicyService,
    );
  });

  it('creates a ledger and owner membership', async () => {
    repository.createWithOwner.mockResolvedValue(ledgerSummary);

    const result = await service.createLedger('user_1', {
      name: '家庭账本',
      type: 'family',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
    });

    expect(result.currentMember.role).toBe('owner');
    expect(repository.createWithOwner).toHaveBeenCalledWith('user_1', {
      name: '家庭账本',
      type: 'family',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
    });
  });

  it('lists ledgers for active memberships', async () => {
    repository.findLedgersForUser.mockResolvedValue([ledgerSummary]);

    await expect(service.listLedgers('user_1')).resolves.toEqual([ledgerSummary]);
  });

  it('requires manage policy before updating ledger', async () => {
    policy.canManageLedger.mockResolvedValue(false);

    await expect(service.updateLedger('user_1', 'ledger_1', { name: '新名称' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(repository.updateLedger).not.toHaveBeenCalled();
  });

  it('prevents changing or removing owner members', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findMember.mockResolvedValue({ id: 'member_1', role: 'owner' });

    await expect(
      service.updateMemberRole('user_1', 'ledger_1', 'member_1', { role: 'editor' }),
    ).rejects.toMatchObject({
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });

    await expect(service.removeMember('user_1', 'ledger_1', 'member_1')).rejects.toMatchObject({
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
  });
});
