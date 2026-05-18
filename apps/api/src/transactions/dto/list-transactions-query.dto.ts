import { Transform } from 'class-transformer';
import { IsISO8601, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import type { TransactionType } from '@bookkeeping/shared-types';

const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense', 'transfer'];

function toOptionalNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
}

export class ListTransactionsQueryDto {
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  accountId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  categoryId?: string;

  @IsOptional()
  @IsISO8601()
  occurredFrom?: string;

  @IsOptional()
  @IsISO8601()
  occurredTo?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
