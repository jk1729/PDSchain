import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class WarehouseReceiptDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  warehouseId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityId!: string;

  @IsNotEmpty()
  @IsPositive()
  @IsInt()
  quantity!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  batchReference!: string;
}
