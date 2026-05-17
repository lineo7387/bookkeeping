import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class UpdateLedgerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
