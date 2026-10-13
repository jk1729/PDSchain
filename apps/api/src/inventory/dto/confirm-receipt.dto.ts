import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmReceiptDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  receivedQuantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shortageQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  excessQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  damagedQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  discrepancyReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  confirmationRef?: string;
}
