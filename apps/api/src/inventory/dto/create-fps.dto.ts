import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFairPriceShopDto {
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
  @MaxLength(64)
  warehouseCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
