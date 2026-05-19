import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let adminService: jest.Mocked<
    Pick<AdminService, 'listUsers' | 'listLedgers' | 'listAiTasks' | 'listAuditLogs'>
  >;
  let controller: AdminController;

  beforeEach(() => {
    adminService = {
      listUsers: jest.fn(),
      listLedgers: jest.fn(),
      listAiTasks: jest.fn(),
      listAuditLogs: jest.fn(),
    };
    controller = new AdminController(adminService as unknown as AdminService);
  });

  it('wraps read-only admin results', async () => {
    adminService.listUsers.mockResolvedValue({ items: [], limit: 20, offset: 0 });
    adminService.listLedgers.mockResolvedValue({ items: [], limit: 20, offset: 0 });
    adminService.listAiTasks.mockResolvedValue({ items: [], limit: 20, offset: 0 });
    adminService.listAuditLogs.mockResolvedValue({ items: [], limit: 20, offset: 0 });

    await expect(controller.listUsers({ limit: 20, offset: 0 })).resolves.toEqual({
      success: true,
      data: { items: [], limit: 20, offset: 0 },
    });
    await expect(controller.listLedgers({ limit: 20, offset: 0 })).resolves.toEqual({
      success: true,
      data: { items: [], limit: 20, offset: 0 },
    });
    await expect(controller.listAiTasks({ limit: 20, offset: 0 })).resolves.toEqual({
      success: true,
      data: { items: [], limit: 20, offset: 0 },
    });
    await expect(controller.listAuditLogs({ limit: 20, offset: 0 })).resolves.toEqual({
      success: true,
      data: { items: [], limit: 20, offset: 0 },
    });
  });
});
