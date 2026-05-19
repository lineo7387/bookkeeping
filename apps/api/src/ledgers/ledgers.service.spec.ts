import { ForbiddenException } from '@nestjs/common';
import type { LedgerSummary } from '@bookkeeping/shared-types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { LedgersRepository } from './ledgers.repository';
import { LedgersService } from './ledgers.service';

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
      | 'findMemberByUser'
      | 'listMembers'
      | 'updateMemberRole'
      | 'removeMember'
    >
  >;
  let policy: jest.Mocked<Pick<LedgerPolicyService, 'canViewLedger' | 'canManageLedger'>>;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'record'>>;
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

  const memberSummary = {
    id: 'member_1',
    ledgerId: 'ledger_1',
    userId: 'user_2',
    role: 'editor' as const,
    status: 'active' as const,
    joinedAt: '2026-05-18T00:00:00.000Z',
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  };

  beforeEach(() => {
    repository = {
      createWithOwner: jest.fn(),
      findLedgersForUser: jest.fn(),
      findLedgerForUser: jest.fn(),
      updateLedger: jest.fn(),
      archiveLedger: jest.fn(),
      findMember: jest.fn(),
      findMemberByUser: jest.fn(),
      listMembers: jest.fn(),
      updateMemberRole: jest.fn(),
      removeMember: jest.fn(),
    };
    policy = {
      canViewLedger: jest.fn(),
      canManageLedger: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn().mockResolvedValue({ id: 'audit_1' }),
    };
    service = new LedgersService(
      repository as unknown as LedgersRepository,
      policy as unknown as LedgerPolicyService,
      auditLogsService as unknown as AuditLogsService,
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

  it('records an audit log after creating a ledger', async () => {
    repository.createWithOwner.mockResolvedValue(ledgerSummary);

    await service.createLedger('user_1', {
      name: '家庭账本',
      type: 'family',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
    });

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'ledger',
        targetId: 'ledger_1',
        action: 'ledger.create',
        metadata: expect.objectContaining({
          name: '家庭账本',
          type: 'family',
          defaultCurrency: 'CNY',
          timezone: 'Asia/Shanghai',
        }),
      }),
    );
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

  it('records an audit log after updating a ledger', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.updateLedger.mockResolvedValue({ ...ledgerSummary, name: '新名称' });

    await service.updateLedger('user_1', 'ledger_1', { name: '新名称' });

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'ledger',
        targetId: 'ledger_1',
        action: 'ledger.update',
        metadata: expect.objectContaining({ name: '新名称' }),
      }),
    );
  });

  it('records an audit log after archiving a ledger', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findMemberByUser.mockResolvedValue({ id: 'member_owner', role: 'owner' });
    repository.archiveLedger.mockResolvedValue({ archived: true });

    await service.archiveLedger('user_1', 'ledger_1');

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'ledger',
        targetId: 'ledger_1',
        action: 'ledger.archive',
      }),
    );
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

  it('records an audit log after updating a member role', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findMember.mockResolvedValue({ id: 'member_1', role: 'editor' });
    repository.updateMemberRole.mockResolvedValue({ ...memberSummary, role: 'viewer' });

    await service.updateMemberRole('user_1', 'ledger_1', 'member_1', { role: 'viewer' });

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'ledger_member',
        targetId: 'member_1',
        action: 'member.role.update',
        metadata: expect.objectContaining({
          userId: 'user_2',
          previousRole: 'editor',
          role: 'viewer',
        }),
      }),
    );
  });

  it('records an audit log after removing a member', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findMember.mockResolvedValue({ id: 'member_1', role: 'editor' });
    repository.removeMember.mockResolvedValue({ ...memberSummary, status: 'removed' });

    await service.removeMember('user_1', 'ledger_1', 'member_1');

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'ledger_member',
        targetId: 'member_1',
        action: 'member.remove',
        metadata: expect.objectContaining({
          userId: 'user_2',
          previousRole: 'editor',
        }),
      }),
    );
  });
});
