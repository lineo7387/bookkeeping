import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { fail } from '../common/api-response';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly usersRepository: UsersRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = request.user?.id;
    if (!userId) {
      throw adminDenied();
    }

    const user = await this.usersRepository.findById(userId);
    if (!user?.isSystemAdmin) {
      throw adminDenied();
    }

    return true;
  }
}

function adminDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'System admin role required'));
}
