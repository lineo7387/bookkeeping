import { Transform } from 'class-transformer';
import { IsISO8601, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import type { TransactionType } from '@bookkeeping/shared-types';
import { TIMEZONE_AWARE_ISO_DATETIME_PATTERN } from './date-time-validation';

const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer'];
const TRANSACTION_VISIBILITIES = ['ledger', 'private'] as const;
const POSITIVE_DECIMAL_STRING_PATTERN = /^(?=.*[1-9])\d{1,16}(\.\d{1,2})?$/;

export class UpdateTransactionDto {
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  @Matches(POSITIVE_DECIMAL_STRING_PATTERN)
  amount?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(TIMEZONE_AWARE_ISO_DATETIME_PATTERN)
  occurredAt?: string;

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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  transferTargetAccountId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  merchant?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsIn(TRANSACTION_VISIBILITIES)
  visibility?: 'ledger' | 'private';
}
