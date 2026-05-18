import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import type { CategoryType } from '@bookkeeping/shared-types';

const CATEGORY_TYPES: CategoryType[] = ['income', 'expense'];

export class CreateCategoryDto {
  @IsIn(CATEGORY_TYPES)
  type!: CategoryType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  parentId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}
