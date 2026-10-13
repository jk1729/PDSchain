import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommodityDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  unit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
