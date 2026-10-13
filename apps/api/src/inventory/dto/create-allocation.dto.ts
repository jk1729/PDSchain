import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAllocationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  sourceWarehouseCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  destinationFpsCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityCode!: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  allocatedQuantity!: number;

  @IsOptional()
  @IsInt()
  period?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  allocationRef?: string;
}
