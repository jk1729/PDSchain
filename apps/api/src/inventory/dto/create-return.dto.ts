import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateStockReturnDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  sourceFpsCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  destinationWarehouseCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  batchNumber?: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  returnQuantity!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  returnRef?: string;
}
