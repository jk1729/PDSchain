import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStockAdjustmentDto {
  @IsNotEmpty()
  @IsIn(['WAREHOUSE', 'FPS'])
  locationType!: 'WAREHOUSE' | 'FPS';

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  locationCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  batchNumber?: string;

  @IsNotEmpty()
  @IsIn(['INCREASE', 'DECREASE'])
  adjustmentType!: 'INCREASE' | 'DECREASE';

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantityChange!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  reasonCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  explanation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  adjustmentRef?: string;
}
