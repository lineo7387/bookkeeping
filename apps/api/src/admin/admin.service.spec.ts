import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('returns redacted users', async () => {
    const repository = {
      listUsers: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'user_1',
            email: 'lineo@example.com',
            phone: null,
            nickname: 'Lineo',
            status: 'active',
            isSystemAdmin: true,
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
          },
        ],
        limit: 20,
        offset: 0,
      }),
    };
    const service = new AdminService(repository as unknown as AdminRepository);

    await expect(service.listUsers({ limit: 20, offset: 0 })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'user_1',
          email: 'lineo@example.com',
          isSystemAdmin: true,
        }),
      ],
      limit: 20,
      offset: 0,
    });
  });

  it('returns ledger, AI task, and audit log read models', async () => {
    const repository = {
      listLedgers: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'ledger_1',
            name: '家庭账本',
            type: 'family',
            ownerId: 'user_1',
            defaultCurrency: 'CNY',
            timezone: 'Asia/Shanghai',
            memberCount: 2,
            archivedAt: null,
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
          },
        ],
        limit: 20,
        offset: 0,
      }),
      listAuditLogs: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'audit_1',
            actorUserId: 'user_1',
            ledgerId: 'ledger_1',
            targetType: 'transaction',
            targetId: 'transaction_1',
            action: 'transaction.create',
            summary: 'Created transaction',
            metadata: { amount: '86.00' },
            createdAt: '2026-05-19T00:00:00.000Z',
          },
        ],
        limit: 20,
        offset: 0,
      }),
      listAiTasks: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'task_1',
            status: 'succeeded',
            type: 'text_parse',
            createdAt: '2026-05-19T11:00:00.000Z',
            updatedAt: '2026-05-19T11:01:00.000Z',
          },
        ],
        limit: 20,
        offset: 0,
      }),
    };
    const service = new AdminService(repository as unknown as AdminRepository);

    await expect(service.listLedgers({ limit: 20, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 'ledger_1', memberCount: 2 }],
    });
    await expect(service.listAiTasks({ limit: 20, offset: 0 })).resolves.toEqual({
      items: [
        {
          id: 'task_1',
          status: 'succeeded',
          type: 'text_parse',
          createdAt: '2026-05-19T11:00:00.000Z',
          updatedAt: '2026-05-19T11:01:00.000Z',
        },
      ],
      limit: 20,
      offset: 0,
    });
    expect(repository.listAiTasks).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    await expect(service.listAuditLogs({ limit: 20, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 'audit_1', metadata: { amount: '86.00' } }],
    });
  });
});
