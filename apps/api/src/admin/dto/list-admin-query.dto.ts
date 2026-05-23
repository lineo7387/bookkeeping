import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { AiTaskStatus, AiTaskType } from '@bookkeeping/shared-types';

const AI_TASK_STATUSES: AiTaskStatus[] = ['pending', 'processing', 'succeeded', 'failed'];
const AI_TASK_TYPES: AiTaskType[] = ['text_parse', 'receipt_ocr', 'classify', 'insight'];

function toOptionalNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
}

export class ListAdminQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class ListAdminAiTasksQueryDto extends ListAdminQueryDto {
  @IsOptional()
  @IsIn(AI_TASK_STATUSES)
  status?: AiTaskStatus;

  @IsOptional()
  @IsIn(AI_TASK_TYPES)
  type?: AiTaskType;
}

export type NormalizedAdminQuery = Required<Pick<ListAdminQueryDto, 'limit' | 'offset'>> &
  Partial<Pick<ListAdminAiTasksQueryDto, 'status' | 'type'>>;
