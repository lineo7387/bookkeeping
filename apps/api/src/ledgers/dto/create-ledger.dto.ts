import { IsIn, IsString, Length, MinLength } from 'class-validator';

export class CreateLedgerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['personal', 'family'])
  type!: 'personal' | 'family';

  @IsString()
  @Length(3, 3)
  defaultCurrency = 'CNY';

  @IsString()
  timezone = 'Asia/Shanghai';
}
