import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LedgerPolicyGuard } from './ledger-policy.guard';
import { LedgerPolicyService } from '../../policies/ledger-policy.service';

describe('LedgerPolicyGuard', () => {
  it('denies manage action when policy returns false', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('manage'),
    } as unknown as Reflector;
    const policy = {
      canManageLedger: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<LedgerPolicyService>;
    const guard = new LedgerPolicyGuard(reflector, policy);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user_1' },
          params: { ledgerId: 'ledger_1' },
        }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
  });
});
