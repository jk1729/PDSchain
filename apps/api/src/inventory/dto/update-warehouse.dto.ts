import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  capacityMtl?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
