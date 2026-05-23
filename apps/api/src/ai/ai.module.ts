import { Module } from '@nestjs/common';
import { PoliciesModule } from '../policies/policies.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiController } from './ai.controller';
import { AI_FETCH_IMPL, AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';

@Module({
  imports: [PoliciesModule, TransactionsModule],
  controllers: [AiController],
  providers: [{ provide: AI_FETCH_IMPL, useValue: fetch }, AiInternalClient, AiRepository, AiService],
})
export class AiModule {}
