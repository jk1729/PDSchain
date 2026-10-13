import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class StockReceiptDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  warehouseCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  batchNumber!: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  receiptRef?: string;
}
