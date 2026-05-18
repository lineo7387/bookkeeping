import { IsIn, IsOptional } from 'class-validator';
import type { CategoryType } from '@bookkeeping/shared-types';

const CATEGORY_TYPES: CategoryType[] = ['income', 'expense'];

export class ListCategoriesQueryDto {
  @IsOptional()
  @IsIn(CATEGORY_TYPES)
  type?: CategoryType;
}
