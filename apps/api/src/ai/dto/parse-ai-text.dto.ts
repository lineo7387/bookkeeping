import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ParseAiTextDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  inputText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;
}
