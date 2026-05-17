import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fail } from '../api-response';
import { LedgerPolicyService } from '../../policies/ledger-policy.service';
import { LEDGER_POLICY_KEY, type LedgerPolicyAction } from './ledger-policy.decorator';

interface LedgerPolicyRequest {
  user?: {
    id: string;
  };
  params: {
    ledgerId?: string;
  };
}

@Injectable()
export class LedgerPolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ledgerPolicyService: LedgerPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<LedgerPolicyAction | undefined>(
      LEDGER_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest<LedgerPolicyRequest>();
    const userId = request.user?.id;
    const ledgerId = request.params.ledgerId;
    if (!userId || !ledgerId) {
      throw ledgerAccessDenied();
    }

    if (action === 'view') {
      const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
      if (!allowed) {
        throw ledgerAccessDenied();
      }
      return true;
    }

    if (action === 'manage') {
      const allowed = await this.ledgerPolicyService.canManageLedger(userId, ledgerId);
      if (!allowed) {
        throw memberRoleDenied();
      }
      return true;
    }

    const allowed = await this.ledgerPolicyService.canCreateTransaction(userId, ledgerId);
    if (!allowed) {
      throw memberRoleDenied();
    }
    return true;
  }
}

function ledgerAccessDenied(): ForbiddenException {
  return new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
}

function memberRoleDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'));
}
