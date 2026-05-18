import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, MinLength } from 'class-validator';
import type { AccountType, AccountVisibility } from '@bookkeeping/shared-types';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank_card', 'alipay', 'wechat', 'credit_card', 'other'];
const ACCOUNT_VISIBILITIES: AccountVisibility[] = ['ledger', 'private'];
const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export class UpdateAccountDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  type?: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_STRING_PATTERN)
  initialBalance?: string;

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_STRING_PATTERN)
  currentBalance?: string;

  @IsOptional()
  @IsIn(ACCOUNT_VISIBILITIES)
  visibility?: AccountVisibility;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
