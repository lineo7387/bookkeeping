import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PoliciesModule } from '../policies/policies.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiController } from './ai.controller';
import { AI_FETCH_IMPL, AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';
import { OCR_QUEUE_NAME } from './ocr-queue.constants';
import { OcrQueueProcessor } from './ocr-queue.processor';

@Module({
  imports: [
    PoliciesModule,
    TransactionsModule,
    BullModule.registerQueue({ name: OCR_QUEUE_NAME }),
  ],
  controllers: [AiController],
  providers: [
    { provide: AI_FETCH_IMPL, useValue: fetch },
    AiInternalClient,
    AiRepository,
    AiService,
    OcrQueueProcessor,
  ],
})
export class AiModule {}
