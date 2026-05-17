import { SetMetadata } from '@nestjs/common';

export const LEDGER_POLICY_KEY = 'ledger_policy';

export type LedgerPolicyAction = 'view' | 'manage' | 'create_transaction';

export const RequireLedgerPolicy = (action: LedgerPolicyAction) =>
  SetMetadata(LEDGER_POLICY_KEY, action);
