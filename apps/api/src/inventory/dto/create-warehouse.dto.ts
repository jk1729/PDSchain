import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
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
  @MaxLength(64)
  districtCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacityMtl?: number;
}
