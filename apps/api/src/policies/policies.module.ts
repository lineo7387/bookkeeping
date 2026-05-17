import { Module } from '@nestjs/common';
import { LedgerPolicyService } from './ledger-policy.service';

@Module({
  providers: [LedgerPolicyService],
  exports: [LedgerPolicyService],
})
export class PoliciesModule {}
