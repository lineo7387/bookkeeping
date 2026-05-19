import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PoliciesModule } from '../policies/policies.module';
import { LedgersController } from './ledgers.controller';
import { LedgersRepository } from './ledgers.repository';
import { LedgersService } from './ledgers.service';

@Module({
  imports: [AuditLogsModule, PoliciesModule],
  controllers: [LedgersController],
  providers: [LedgersRepository, LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
