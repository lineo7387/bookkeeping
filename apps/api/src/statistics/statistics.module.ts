import { Module } from '@nestjs/common';
import { PoliciesModule } from '../policies/policies.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsRepository } from './statistics.repository';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [PoliciesModule],
  controllers: [StatisticsController],
  providers: [StatisticsRepository, StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
