import { Transform } from 'class-transformer';
import { IsISO8601, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TIMEZONE_AWARE_ISO_DATETIME_PATTERN } from '../../transactions/dto/date-time-validation';

const TRANSACTION_VISIBILITIES = ['ledger', 'private'] as const;
const POSITIVE_DECIMAL_STRING_PATTERN = /^(?=.*[1-9])\d{1,16}(\.\d{1,2})?$/;

export class ConfirmAiExtractionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  ledgerId!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  accountId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(POSITIVE_DECIMAL_STRING_PATTERN)
  amount?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(TIMEZONE_AWARE_ISO_DATETIME_PATTERN)
  occurredAt?: string;

  @IsOptional()
  @IsIn(TRANSACTION_VISIBILITIES)
  visibility?: 'ledger' | 'private';

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
