import { IsISO8601, IsOptional, Matches } from 'class-validator';
import { TIMEZONE_AWARE_ISO_DATETIME_PATTERN } from '../../transactions/dto/date-time-validation';

export class StatisticsDateRangeQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(TIMEZONE_AWARE_ISO_DATETIME_PATTERN)
  occurredFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(TIMEZONE_AWARE_ISO_DATETIME_PATTERN)
  occurredTo?: string;
}
