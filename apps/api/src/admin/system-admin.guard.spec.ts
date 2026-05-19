import { ForbiddenException } from '@nestjs/common';
import { SystemAdminGuard } from './system-admin.guard';

describe('SystemAdminGuard', () => {
  it('allows system admin users', async () => {
    const usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user_1', isSystemAdmin: true }),
    };
    const guard = new SystemAdminGuard(usersRepository as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user_1' } }) }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it('rejects non-admin users', async () => {
    const usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user_1', isSystemAdmin: false }),
    };
    const guard = new SystemAdminGuard(usersRepository as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user_1' } }) }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
