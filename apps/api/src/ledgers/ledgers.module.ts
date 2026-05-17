import { Module } from '@nestjs/common';
import { PoliciesModule } from '../policies/policies.module';
import { LedgersController } from './ledgers.controller';
import { LedgersRepository } from './ledgers.repository';
import { LedgersService } from './ledgers.service';

@Module({
  imports: [PoliciesModule],
  controllers: [LedgersController],
  providers: [LedgersRepository, LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
