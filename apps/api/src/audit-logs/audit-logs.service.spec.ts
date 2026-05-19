import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('records a sanitized audit event', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({
        id: 'audit_1',
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'transaction',
        targetId: 'transaction_1',
        action: 'transaction.create',
        summary: 'Created transaction',
        metadata: { amount: '86.00' },
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    };
    const service = new AuditLogsService(repository as unknown as AuditLogsRepository);

    await expect(
      service.record({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'transaction',
        targetId: 'transaction_1',
        action: 'transaction.create',
        summary: 'Created transaction',
        metadata: { amount: '86.00', password: 'secret' },
      }),
    ).resolves.toMatchObject({
      id: 'audit_1',
      metadata: { amount: '86.00' },
    });

    expect(repository.create).toHaveBeenCalledWith({
      actorUserId: 'user_1',
      ledgerId: 'ledger_1',
      targetType: 'transaction',
      targetId: 'transaction_1',
      action: 'transaction.create',
      summary: 'Created transaction',
      metadata: { amount: '86.00' },
    });
  });
});
