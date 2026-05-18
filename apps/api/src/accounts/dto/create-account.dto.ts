import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min, MinLength } from 'class-validator';
import type { AccountType, AccountVisibility } from '@bookkeeping/shared-types';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank_card', 'alipay', 'wechat', 'credit_card', 'other'];
const ACCOUNT_VISIBILITIES: AccountVisibility[] = ['ledger', 'private'];
const DECIMAL_STRING_PATTERN = /^-?\d{1,16}(\.\d{1,2})?$/;

export class CreateAccountDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn(ACCOUNT_TYPES)
  type!: AccountType;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'CNY';

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_STRING_PATTERN)
  initialBalance?: string = '0';

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_STRING_PATTERN)
  currentBalance?: string;

  @IsOptional()
  @IsIn(ACCOUNT_VISIBILITIES)
  visibility?: AccountVisibility = 'ledger';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
