import { IsIn, IsOptional } from 'class-validator';
import type { CategoryType } from '@bookkeeping/shared-types';
import { StatisticsDateRangeQueryDto } from './statistics-date-range-query.dto';

const CATEGORY_STATISTICS_TYPES: CategoryType[] = ['income', 'expense'];

export class CategoryStatisticsQueryDto extends StatisticsDateRangeQueryDto {
  @IsOptional()
  @IsIn(CATEGORY_STATISTICS_TYPES)
  type?: CategoryType = 'expense';
}
